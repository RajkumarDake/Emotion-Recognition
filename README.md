# Anvitha Emotion Recognition Model

A deep learning-based emotion recognition system using CNN + BiLSTM architecture for text analysis.

## 📁 Project Structure

```
anvitha-updated/
├── models/                          # Trained models and preprocessors
│   ├── emotion_cnn_bilstm_model.keras  # Voice emotion model
│   ├── tokenizer.pkl                   # Text tokenizer (generated)
│   └── label_encoder.pkl               # Label encoder (generated)
├── datasets/                        # Training datasets
│   └── text/
│       ├── train.txt
│       ├── val.txt
│       └── test.txt
├── scripts/                         # Training notebooks
│   ├── anvitha_text_model.ipynb    # Text emotion training
│   ├── anvitha_voice_model.ipynb   # Voice emotion training
│   └── save_preprocessors.py       # Helper to save tokenizer/encoder
├── use_model.py                     # Main inference script
├── quick_test.py                    # Quick test script
└── requirements.txt                 # Python dependencies
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Train the Model (if not already trained)

Open and run the Jupyter notebook:

```bash
jupyter notebook scripts/anvitha_text_model.ipynb
```

After training, add this cell at the end to save the preprocessors:

```python
import pickle
import os

# Save tokenizer and label encoder
model_dir = os.path.join('..', 'models')
os.makedirs(model_dir, exist_ok=True)

with open(os.path.join(model_dir, 'tokenizer.pkl'), 'wb') as f:
    pickle.dump(tokenizer, f)

with open(os.path.join(model_dir, 'label_encoder.pkl'), 'wb') as f:
    pickle.dump(le, f)

# Save the model
model.save(os.path.join(model_dir, 'text_emotion_model.keras'))

print("✓ All files saved!")
```

### 3. Test the Model

Run the quick test to verify everything works:

```bash
python quick_test.py
```

### 4. Use the Model Interactively

```bash
python use_model.py
```

This will start an interactive session where you can type text and get emotion predictions.

## 💻 Using the Model in Your Code

### Basic Usage

```python
from use_model import EmotionPredictor

# Initialize predictor
predictor = EmotionPredictor()

# Load model and preprocessors
model_path = 'models/emotion_cnn_bilstm_model.keras'
tokenizer_path = 'models/tokenizer.pkl'
label_encoder_path = 'models/label_encoder.pkl'

predictor.load_model(model_path, tokenizer_path, label_encoder_path)

# Make a prediction
result = predictor.predict("I'm so happy today!")

print(f"Emotion: {result['emotion']}")
print(f"Confidence: {result['confidence']:.2%}")
```

### Get All Probabilities

```python
result = predictor.predict("I'm so happy today!", return_probabilities=True)

print(f"Emotion: {result['emotion']}")
print(f"Confidence: {result['confidence']:.2%}")
print("\nAll probabilities:")
for emotion, prob in result['probabilities'].items():
    print(f"  {emotion}: {prob:.2%}")
```

### Batch Predictions

```python
texts = [
    "I'm so happy today!",
    "This makes me angry.",
    "I feel sad."
]

results = predictor.predict_batch(texts, return_probabilities=True)

for result in results:
    print(f"{result['text']} → {result['emotion']} ({result['confidence']:.2%})")
```

### Without Saved Preprocessors

If you don't have saved tokenizer/label encoder, the script can train them from your data:

```python
predictor = EmotionPredictor()
predictor.load_model('models/emotion_cnn_bilstm_model.keras')

# Train tokenizer and label encoder from training data
predictor.train_tokenizer_from_data('datasets/text/train.txt')

# Save for future use
predictor.save_preprocessors()

# Now you can make predictions
result = predictor.predict("I'm so happy!")
```

## 🎯 Model Details

### Architecture

- **Embedding Layer**: 100-dimensional word embeddings
- **CNN Layer**: 64 filters with kernel size 3 for feature extraction
- **BiLSTM Layer**: 64 units for sequential learning
- **Dense Layers**: 64 units with dropout for classification
- **Output**: Softmax activation for multi-class emotion classification

### Emotions Detected

The model can detect various emotions including:

- Joy/Happiness
- Sadness
- Anger
- Fear
- Surprise
- And more (depending on your training data)

### Performance

- Maximum sequence length: 229 tokens
- Trained with early stopping on validation loss
- Uses Adam optimizer with sparse categorical crossentropy loss

## 📊 Example Output

```
Text: I can't believe I finally finished this project, I'm so relieved!
Emotion: joy (Confidence: 87.34%)

Top 3 predictions:
  - joy: 87.34%
  - relief: 8.21%
  - surprise: 3.12%
```

## 🔧 Troubleshooting

### Model file not found

Make sure you've trained the model and it's saved in the `models/` directory.

### Tokenizer/Label encoder not found

Run the training notebook and save the preprocessors, or let the script train them automatically from your data.

### NLTK data not found

The script will automatically download required NLTK data (stopwords, wordnet) on first run.

### Import errors

Make sure all dependencies are installed:

```bash
pip install -r requirements.txt
```

## 📝 Notes

- The model expects text input in English
- Text is automatically cleaned (lowercase, lemmatized, stopwords removed)
- Confidence scores represent the model's certainty in its prediction
- For best results, provide complete sentences rather than single words

## 🤝 Integration with Chainlit

To use this model with Chainlit for a web interface, see the `.chainlit` configuration file.

## 📄 License

This project is for educational and research purposes.
