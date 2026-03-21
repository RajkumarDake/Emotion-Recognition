"""
Anvitha Emotion Recognition — Voice Model Inference
=====================================================
Custom LSTM model trained on the TESS (Toronto Emotional Speech Set) dataset.
Audio feature extraction: MFCC (Mel-Frequency Cepstral Coefficients, 40 bands)
Architecture: LSTM → Dense (softmax)
"""

import os
import pickle
import numpy as np
import librosa
from tensorflow.keras.models import load_model


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def extract_mfcc(audio_path: str, n_mfcc: int = 40,
                 duration: float = 3.0, offset: float = 0.5) -> np.ndarray:
    """
    Extract MFCC features from an audio file.

    The parameters match the training configuration exactly:
      - 40 MFCC coefficients
      - 3-second clip starting at 0.5 s offset (avoids leading silence)
      - Time-averaged into a single feature vector of shape (40,)

    Args:
        audio_path: Path to the WAV audio file.
        n_mfcc:     Number of MFCC bands (default 40).
        duration:   Clip duration in seconds (default 3.0).
        offset:     Start offset in seconds (default 0.5).

    Returns:
        1-D numpy array of shape ``(n_mfcc,)``.
    """
    y, sr = librosa.load(audio_path, duration=duration, offset=offset)
    mfcc  = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    return np.mean(mfcc.T, axis=0)


# ---------------------------------------------------------------------------
# Predictor class
# ---------------------------------------------------------------------------

class VoiceEmotionPredictor:
    """
    Emotion predictor backed by our custom LSTM model.

    The model was trained on the TESS dataset using MFCC features.
    Given a WAV file, it:
      1. Loads the audio and extracts 40-band MFCC features.
      2. Reshapes them to match the LSTM input format ``(40, 1)``.
      3. Passes them through the LSTM network and returns the top-1 emotion.
    """

    def __init__(self, model_path: str, encoder_path: str, scaler_path: str = None):
        """
        Load the trained LSTM voice model and label encoder.

        Args:
            model_path:   Path to the .h5 Keras model file.
            encoder_path: Path to the pickled sklearn LabelEncoder.
            scaler_path:  (Optional) Path to a feature scaler — not used in
                          the current model version (training used raw MFCCs).
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Voice model not found: {model_path}")
        if not os.path.exists(encoder_path):
            raise FileNotFoundError(f"Label encoder not found: {encoder_path}")

        print(f"Loading LSTM voice model from {model_path} ...")
        self.model = load_model(model_path)

        with open(encoder_path, 'rb') as f:
            self.encoder = pickle.load(f)

        print("Voice model loaded successfully.\n")

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, audio_path: str) -> dict:
        """
        Predict the emotion expressed in an audio file.

        Pipeline:
          WAV file → MFCC extraction → reshape (1, 40, 1) → LSTM → argmax → label

        Args:
            audio_path: Path to a WAV audio file.

        Returns:
            dict with keys:
              - ``emotion``    — predicted emotion label
              - ``confidence`` — model softmax score for the top class
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        features = extract_mfcc(audio_path)

        if features.size == 0:
            raise ValueError("Audio file appears to be empty or unreadable.")

        # Reshape for LSTM: (batch=1, timesteps=40, features=1)
        x = features.reshape(1, features.shape[0], 1)

        probs      = self.model.predict(x, verbose=0)[0]
        top_idx    = int(np.argmax(probs))
        emotion    = self.encoder.categories_[0][top_idx]
        confidence = float(probs[top_idx])

        return {
            'emotion':    emotion,
            'confidence': confidence,
        }


# ---------------------------------------------------------------------------
# Demo / interactive runner
# ---------------------------------------------------------------------------

def main():
    base   = os.path.dirname(os.path.abspath(__file__))
    root   = os.path.dirname(base)
    models = os.path.join(root, 'models')

    predictor = VoiceEmotionPredictor(
        model_path   = os.path.join(models, 'anvitha_voice_emotion_model.h5'),
        encoder_path = os.path.join(models, 'encoder.pkl'),
        scaler_path  = os.path.join(models, 'scaler.pkl'),
    )

    print("=" * 60)
    print("  LSTM Voice Emotion Classifier — Interactive Mode")
    print("  Enter path to a .wav file  (or 'quit' to exit)")
    print("=" * 60 + "\n")

    while True:
        try:
            path = input("WAV path >>> ").strip()
            if path.lower() in ('quit', 'exit', 'q'):
                print("Goodbye.")
                break
            if not path:
                continue
            result = predictor.predict(path)
            print(f"Emotion    : {result['emotion']}")
            print(f"Confidence : {result['confidence']:.2%}\n")
        except FileNotFoundError as e:
            print(f"Not found: {e}\n")
        except KeyboardInterrupt:
            print("\n\nGoodbye.")
            break
        except Exception as e:
            print(f"Error: {e}\n")


if __name__ == "__main__":
    main()
