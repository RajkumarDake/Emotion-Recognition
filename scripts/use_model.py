"""
Anvitha Emotion Recognition - Model Inference Script
This script loads the trained emotion recognition model and provides
an easy-to-use interface for making predictions on text or voice input.
"""

import os
import sys
import numpy as np
import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import load_model
from sklearn.preprocessing import LabelEncoder
import pickle
import json
import time

# Download NLTK data if not already present
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)
    
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)
    
try:
    nltk.data.find('corpora/omw-1.4')
except LookupError:
    nltk.download('omw-1.4', quiet=True)


class EmotionPredictor:
    """
    A class to handle emotion prediction from text using a trained model.
    """
    
    def __init__(self, model_path=None, tokenizer_path=None, label_encoder_path=None):
        """
        Initialize the EmotionPredictor.
        
        Args:
            model_path: Path to the saved Keras model
            tokenizer_path: Path to the saved tokenizer (pickle file)
            label_encoder_path: Path to the saved label encoder (pickle file)
        """
        # Set default paths
        self.project_root = os.path.dirname(os.path.abspath(__file__))
        self.model_dir = os.path.join(self.project_root, 'models')
        
        # Initialize NLTK tools
        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()
        
        # Force loading of wordnet to avoid thread-safety issues/attribute errors in Flask
        try:
            self.lemmatizer.lemmatize('a')
        except:
            pass
        
        # Model parameters (should match training)
        self.MAX_LEN = 229
        
        # Load model and preprocessors
        self.model = None
        self.tokenizer = None
        self.label_encoder = None
        
        if model_path:
            self.load_model(model_path, tokenizer_path, label_encoder_path)
    
    def clean_text(self, text):
        """
        Clean and preprocess text for model input.
        
        Args:
            text: Raw text string
            
        Returns:
            Cleaned text string
        """
        # Remove non-alphabetic characters and convert to lowercase
        text = re.sub(r'[^a-zA-Z]', ' ', text).lower()
        
        # Lemmatize and remove stopwords
        words = [
            self.lemmatizer.lemmatize(w) 
            for w in text.split() 
            if w not in self.stop_words
        ]
        
        return ' '.join(words)
    
    def load_model(self, model_path, tokenizer_path=None, label_encoder_path=None):
        """
        Load the trained model and preprocessors.
        
        Args:
            model_path: Path to the saved Keras model
            tokenizer_path: Path to the saved tokenizer
            label_encoder_path: Path to the saved label encoder
        """
        print(f"Loading model from: {model_path}")
        
        # Load the Keras model
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        self.model = load_model(model_path)
        print("✓ Model loaded successfully")
        
        # Load tokenizer
        if tokenizer_path and os.path.exists(tokenizer_path):
            with open(tokenizer_path, 'rb') as f:
                self.tokenizer = pickle.load(f)
            print("✓ Tokenizer loaded successfully")
        else:
            print("⚠ Warning: Tokenizer not found. You'll need to train or provide one.")
        
        # Load label encoder
        if label_encoder_path and os.path.exists(label_encoder_path):
            with open(label_encoder_path, 'rb') as f:
                self.label_encoder = pickle.load(f)
            print("✓ Label encoder loaded successfully")
        else:
            print("⚠ Warning: Label encoder not found. You'll need to train or provide one.")
    
    def train_tokenizer_from_data(self, data_path=None):
        """
        Train tokenizer from the training data.
        
        Args:
            data_path: Path to training data file (default: datasets/text/train.txt)
        """
        if data_path is None:
            data_path = os.path.join(self.project_root, 'datasets', 'text', 'train.txt')
        
        print(f"Training tokenizer from: {data_path}")
        
        # Load training data
        train_data = pd.read_csv(data_path, names=['Text', 'Emotion'], sep=';')
        
        # Clean text
        train_data['Clean_Text'] = train_data['Text'].apply(self.clean_text)
        
        # Train tokenizer
        self.tokenizer = Tokenizer()
        self.tokenizer.fit_on_texts(train_data['Clean_Text'])
        
        # Train label encoder
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(train_data['Emotion'])
        
        print(f"✓ Tokenizer trained with vocabulary size: {len(self.tokenizer.word_index)}")
        print(f"✓ Label encoder trained with classes: {self.label_encoder.classes_}")
    
    def save_preprocessors(self, tokenizer_path=None, label_encoder_path=None):
        """
        Save tokenizer and label encoder for future use.
        
        Args:
            tokenizer_path: Path to save tokenizer
            label_encoder_path: Path to save label encoder
        """
        if tokenizer_path is None:
            tokenizer_path = os.path.join(self.model_dir, 'tokenizer.pkl')
        
        if label_encoder_path is None:
            label_encoder_path = os.path.join(self.model_dir, 'label_encoder.pkl')
        
        # Save tokenizer
        with open(tokenizer_path, 'wb') as f:
            pickle.dump(self.tokenizer, f)
        print(f"✓ Tokenizer saved to: {tokenizer_path}")
        
        # Save label encoder
        with open(label_encoder_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)
        print(f"✓ Label encoder saved to: {label_encoder_path}")
    
    def predict(self, text, return_probabilities=False):
        """
        Predict emotion from text.
        
        Args:
            text: Input text string
            return_probabilities: If True, return all class probabilities
            
        Returns:
            Dictionary with prediction results including time taken in milliseconds
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        if self.tokenizer is None:
            raise ValueError("Tokenizer not loaded. Call train_tokenizer_from_data() or load_model() with tokenizer.")
        
        if self.label_encoder is None:
            raise ValueError("Label encoder not loaded. Call train_tokenizer_from_data() or load_model() with label encoder.")
        
        # Start timing
        start_time = time.time()
        
        # Clean the input text
        cleaned_text = self.clean_text(text)
        
        # Tokenize and pad
        sequence = self.tokenizer.texts_to_sequences([cleaned_text])
        padded = pad_sequences(sequence, maxlen=self.MAX_LEN)
        
        # Make prediction
        prediction = self.model.predict(padded, verbose=0)
        
        # Get predicted class
        predicted_class_idx = np.argmax(prediction[0])
        predicted_emotion = self.label_encoder.inverse_transform([predicted_class_idx])[0]
        confidence = float(prediction[0][predicted_class_idx])
        
        # Calculate time taken in milliseconds
        end_time = time.time()
        time_ms = round((end_time - start_time) * 1000, 2)
        
        result = {
            'text': text,
            'cleaned_text': cleaned_text,
            'emotion': predicted_emotion,
            'confidence': confidence,
            'time_ms': time_ms
        }
        
        if return_probabilities:
            # Get all class probabilities
            probabilities = {
                emotion: float(prob)
                for emotion, prob in zip(self.label_encoder.classes_, prediction[0])
            }
            result['probabilities'] = probabilities
        
        return result
    
    def predict_batch(self, texts, return_probabilities=False):
        """
        Predict emotions for multiple texts.
        
        Args:
            texts: List of text strings
            return_probabilities: If True, return all class probabilities
            
        Returns:
            List of prediction dictionaries
        """
        return [self.predict(text, return_probabilities) for text in texts]


def main():
    """
    Main function to demonstrate model usage.
    """
    print("=" * 60)
    print("Anvitha Emotion Recognition - Model Inference")
    print("=" * 60)
    print()
    
    # Initialize predictor
    predictor = EmotionPredictor()
    
    # Check if model exists
    model_path = os.path.join(predictor.model_dir, 'emotion_cnn_bilstm_model.keras')
    tokenizer_path = os.path.join(predictor.model_dir, 'tokenizer.pkl')
    label_encoder_path = os.path.join(predictor.model_dir, 'label_encoder.pkl')
    
    # Try to load existing preprocessors, or train new ones
    if os.path.exists(tokenizer_path) and os.path.exists(label_encoder_path):
        predictor.load_model(model_path, tokenizer_path, label_encoder_path)
    else:
        print("Preprocessors not found. Training from data...")
        predictor.load_model(model_path)
        predictor.train_tokenizer_from_data()
        predictor.save_preprocessors()
    
    print()
    print("=" * 60)
    print("Model ready for predictions!")
    print("=" * 60)
    print()
    
    # Example predictions
    sample_texts = [
        "I can't believe I finally finished this project, I'm so relieved!",
        "This is the worst day of my life.",
        "I'm so excited about the upcoming vacation!",
        "I feel really sad and lonely today.",
        "That movie was absolutely terrifying!",
        "I'm so angry about what happened!"
    ]
    
    print("Sample Predictions:")
    print("-" * 60)
    
    for text in sample_texts:
        result = predictor.predict(text)
        print(f"\nText: {result['text']}")
        print(f"Emotion: {result['emotion']}")
        print(f"Time: {result['time_ms']} ms")
    
    print()
    print("=" * 60)
    print("Interactive Mode")
    print("=" * 60)
    print("Enter text to analyze (or 'quit' to exit):")
    print()
    
    # Interactive mode
    while True:
        try:
            user_input = input(">>> ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            if not user_input:
                continue
            
            result = predictor.predict(user_input)
            
            print(f"Emotion: {result['emotion']}")
            print(f"Time: {result['time_ms']} ms")
            
            print()
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
