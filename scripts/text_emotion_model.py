"""
Anvitha Emotion Recognition — Text Model Inference
====================================================
Custom CNN-BiLSTM model trained on the MELD dataset.
Architecture: Embedding → Conv1D → Bidirectional LSTM → Dense (softmax)
"""

import os
import sys
import re
import time
import pickle
import numpy as np

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from tf_keras.preprocessing.sequence import pad_sequences
import tensorflow as _tf

_tf_load_model = _tf.keras.models.load_model

# Download NLTK data if not already present
for _corpus, _pkg in [('corpora/stopwords', 'stopwords'),
                       ('corpora/wordnet', 'wordnet'),
                       ('corpora/omw-1.4', 'omw-1.4')]:
    try:
        nltk.data.find(_corpus)
    except LookupError:
        nltk.download(_pkg, quiet=True)


class TextEmotionPredictor:
    """
    Emotion predictor backed by our custom CNN-BiLSTM model.

    The model was trained from scratch on the MELD (Multimodal EmotionLines
    Dataset) corpus and serialised as a Keras .keras file.  Pre-processing
    (tokenisation, padding, lemmatisation) exactly mirrors the training
    pipeline so that inference results are consistent.
    """

    # Maximum token length — must match training configuration
    MAX_LEN = 229

    def __init__(self, model_path: str, tokenizer_path: str, label_encoder_path: str):
        """
        Load the trained CNN-BiLSTM model and its pre-processors.

        Args:
            model_path:         Path to the .keras model file.
            tokenizer_path:     Path to the pickled Keras Tokenizer.
            label_encoder_path: Path to the pickled sklearn LabelEncoder.
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not os.path.exists(tokenizer_path):
            raise FileNotFoundError(f"Tokenizer file not found: {tokenizer_path}")
        if not os.path.exists(label_encoder_path):
            raise FileNotFoundError(f"Label encoder file not found: {label_encoder_path}")

        print(f"Loading CNN-BiLSTM text model from {model_path} ...")
        self.model = _tf_load_model(model_path, compile=False)

        with open(tokenizer_path, 'rb') as f:
            self.tokenizer = pickle.load(f)

        with open(label_encoder_path, 'rb') as f:
            self.label_encoder = pickle.load(f)

        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()
        # Warm up lemmatiser to avoid first-call latency
        try:
            self.lemmatizer.lemmatize('a')
        except Exception:
            pass

        print("Text model loaded successfully.\n")

    # ------------------------------------------------------------------
    # Pre-processing
    # ------------------------------------------------------------------

    def _preprocess(self, text: str) -> str:
        """
        Replicate the training pre-processing pipeline:
          1. Strip non-alphabetic characters and lower-case.
          2. Lemmatise each token.
          3. Remove English stop-words.
        """
        text = re.sub(r'[^a-zA-Z]', ' ', text).lower()
        tokens = [
            self.lemmatizer.lemmatize(w)
            for w in text.split()
            if w not in self.stop_words
        ]
        return ' '.join(tokens)

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, text: str) -> dict:
        """
        Run the CNN-BiLSTM emotion classifier on *text*.

        Pipeline:
          raw text → clean → tokenise → pad → model.predict → argmax → label

        Args:
            text: Raw input string.

        Returns:
            dict with keys:
              - ``text``       — original input
              - ``emotion``    — predicted emotion label
              - ``confidence`` — model softmax score for the top class
              - ``time_ms``    — inference latency in milliseconds
        """
        t0 = time.time()

        cleaned = self._preprocess(text)
        sequence = self.tokenizer.texts_to_sequences([cleaned])
        padded   = pad_sequences(sequence, maxlen=self.MAX_LEN)

        probs           = self.model.predict(padded, verbose=0)[0]
        top_idx         = int(np.argmax(probs))
        predicted_label = self.label_encoder.inverse_transform([top_idx])[0]
        confidence      = float(probs[top_idx])

        return {
            'text':       text,
            'emotion':    predicted_label,
            'confidence': confidence,
            'time_ms':    round((time.time() - t0) * 1000, 2),
        }

    def predict_batch(self, texts: list) -> list:
        """Run predict() on a list of texts and return a list of result dicts."""
        return [self.predict(t) for t in texts]


# ---------------------------------------------------------------------------
# Demo / interactive runner
# ---------------------------------------------------------------------------

def main():
    base   = os.path.dirname(os.path.abspath(__file__))
    root   = os.path.dirname(base)
    models = os.path.join(root, 'models')

    predictor = TextEmotionPredictor(
        model_path         = os.path.join(models, 'emotion_cnn_bilstm_model.keras'),
        tokenizer_path     = os.path.join(models, 'tokenizer.pkl'),
        label_encoder_path = os.path.join(models, 'label_encoder.pkl'),
    )

    sample_texts = [
        "I can't believe I finally finished this project, I'm so relieved!",
        "This is the worst day of my life.",
        "I'm so excited about the upcoming vacation!",
        "I feel really sad and lonely today.",
        "That movie was absolutely terrifying!",
        "I'm so angry about what happened!",
    ]

    print("=" * 60)
    print("  CNN-BiLSTM Emotion Classifier — Sample Predictions")
    print("=" * 60)
    for text in sample_texts:
        r = predictor.predict(text)
        print(f"\nText    : {r['text']}")
        print(f"Emotion : {r['emotion']}")
        print(f"Time    : {r['time_ms']} ms")

    print("\n" + "=" * 60)
    print("  Interactive Mode  (type 'quit' to exit)")
    print("=" * 60 + "\n")

    while True:
        try:
            user_input = input(">>> ").strip()
            if user_input.lower() in ('quit', 'exit', 'q'):
                print("Goodbye!")
                break
            if not user_input:
                continue
            r = predictor.predict(user_input)
            print(f"Emotion : {r['emotion']}")
            print(f"Time    : {r['time_ms']} ms\n")
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
