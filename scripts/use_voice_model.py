"""
Voice emotion prediction - must match anvitha_voice_model.ipynb exactly:
MFCC only (40 coeffs), duration=3s, offset=0.5s, no scaler. LSTM input (40, 1).
"""

import os
import numpy as np
import librosa
import pickle
from tensorflow.keras.models import load_model


def extract_mfcc(audio_path, n_mfcc=40, duration=3, offset=0.5):
    """Match notebook: 40 MFCCs, mean over time. duration=3, offset=0.5."""
    y, sr = librosa.load(audio_path, duration=duration, offset=offset)
    mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc).T, axis=0)
    return mfcc


class VoiceEmotionPredictor:
    def __init__(self, model_path, scaler_path=None, encoder_path=None):
        """
        Initialize the predictor. scaler_path is ignored (notebook model uses no scaler).
        """
        print("Loading voice emotion model components...")
        self.model = load_model(model_path)
        if encoder_path is None:
            raise ValueError("encoder_path is required")
        with open(encoder_path, 'rb') as f:
            self.encoder = pickle.load(f)
        # Scaler not used - notebook trains without scaling
        self.scaler = None
        if scaler_path and os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
        print("✓ All components loaded successfully.")

    def predict(self, audio_path):
        """
        Predict emotion from an audio file.
        Uses same pipeline as notebook: MFCC 40, duration=3, offset=0.5, input (1, 40, 1).
        """
        import warnings
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.filterwarnings('ignore', category=FutureWarning)

        # Same as notebook: duration=3, offset=0.5, 40 MFCCs
        features = extract_mfcc(audio_path, n_mfcc=40, duration=3, offset=0.5)

        if len(features) == 0:
            raise ValueError("Audio file is empty or could not be loaded")

        # LSTM expects (batch, 40, 1) - no scaler
        features = np.expand_dims(features, axis=0)   # (1, 40)
        features = np.expand_dims(features, axis=-1)   # (1, 40, 1)

        prediction = self.model.predict(features, verbose=0)
        emotion_idx = np.argmax(prediction[0])
        emotion = self.encoder.categories_[0][emotion_idx]
        confidence = float(np.max(prediction[0]))

        return {
            'emotion': emotion,
            'confidence': confidence
        }


if __name__ == "__main__":
    base_path = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_path)
    models_dir = os.path.join(project_root, 'models')

    model_file = os.path.join(models_dir, 'anvitha_voice_emotion_model.h5')
    scaler_file = os.path.join(models_dir, 'scaler.pkl')
    encoder_file = os.path.join(models_dir, 'encoder.pkl')

    if not os.path.exists(model_file) or not os.path.exists(encoder_file):
        print("Error: Model or encoder not found in 'models/' folder.")
    else:
        predictor = VoiceEmotionPredictor(model_file, scaler_file, encoder_file)
        test_file = input("Enter path to a .wav file to test (or press Enter to skip): ").strip()
        if test_file and os.path.exists(test_file):
            result = predictor.predict(test_file)
            print(f"\nResult: Predicted emotion is '{result['emotion']}'")
        elif test_file:
            print(f"File not found: {test_file}")
