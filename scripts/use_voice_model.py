"""
Voice emotion prediction - must match anvitha_voice_model.ipynb exactly:
MFCC only (40 coeffs), duration=3s, offset=0.5s, no scaler. LSTM input (40, 1).
"""

import os
import numpy as np
import librosa
import pickle
import whisper
from tensorflow.keras.models import load_model
from transformers import pipeline


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
        
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        
        # Monkey-patch whisper to use imageio-ffmpeg
        import whisper.audio
        original_load_audio = whisper.audio.load_audio
        
        def patched_load_audio(file: str, sr: int = 16000):
            """Load audio using imageio-ffmpeg instead of system ffmpeg"""
            import numpy as np
            import subprocess
            
            cmd = [
                ffmpeg_path,
                "-nostdin",
                "-threads", "0",
                "-i", file,
                "-f", "s16le",
                "-ac", "1",
                "-acodec", "pcm_s16le",
                "-ar", str(sr),
                "-"
            ]
            try:
                out = subprocess.run(cmd, capture_output=True, check=True).stdout
            except subprocess.CalledProcessError as e:
                raise RuntimeError(f"Failed to load audio: {e.stderr.decode()}") from e
            
            return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0
        
        whisper.audio.load_audio = patched_load_audio
        
        self.whisper_model = whisper.load_model("small")
        
        # Load pretrained emotion classifier
        self.emotion_classifier = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            return_all_scores=True,
            framework="pt"  
        )

    def transcribe_only(self, audio_path):
        """Return only transcribed text (no emotion). Use for fast UI feedback."""
        import warnings
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.filterwarnings('ignore', category=FutureWarning)
        result = self.whisper_model.transcribe(audio_path)
        text = (result.get("text") or "").strip()
        return {"text": text if text else ""}

    def predict(self, audio_path):
        """
        Predict emotion from an audio file using multi-modal approach.
        """
        import warnings
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.filterwarnings('ignore', category=FutureWarning)


        # PATH 1: Whisper transcription + text emotion model (PRIMARY)
        transcribed_text = ""
        try:
            transcription_result = self.whisper_model.transcribe(audio_path)
            transcribed_text = transcription_result["text"].strip()
            
            # Handle empty transcription
            if not transcribed_text:
                transcribed_text = "neutral"
            
            emotion_scores = self.emotion_classifier(transcribed_text)[0]
            
            best_emotion = max(emotion_scores, key=lambda x: x['score'])
            
            # Use text model prediction as primary result
            final_emotion = best_emotion['label']
            final_confidence = float(best_emotion['score'])
            
        except Exception:
            features = extract_mfcc(audio_path, n_mfcc=40, duration=3, offset=0.5)
            
            if len(features) == 0:
                raise ValueError("Audio file is empty or could not be loaded")
            
            features = np.expand_dims(features, axis=0)
            features = np.expand_dims(features, axis=-1)
            
            prediction = self.model.predict(features, verbose=0)
            emotion_idx = np.argmax(prediction[0])
            final_emotion = self.encoder.categories_[0][emotion_idx]
            final_confidence = float(np.max(prediction[0]))
        
        # PATH 2: Voice prosody score (SECONDARY - calculated but not returned for compatibility)
        try:
            features = extract_mfcc(audio_path, n_mfcc=40, duration=3, offset=0.5)
            features = np.expand_dims(features, axis=0)
            features = np.expand_dims(features, axis=-1)
            
            voice_prediction = self.model.predict(features, verbose=0)
            voice_confidence = float(np.max(voice_prediction[0]))
            voice_emotion_idx = np.argmax(voice_prediction[0])
            voice_emotion = self.encoder.categories_[0][voice_emotion_idx]
            
            # Store for future use but don't return to maintain API compatibility
        except Exception as e:
            voice_confidence = 0.0


        # Return same format as before (client compatibility)
        return {
            'emotion': final_emotion,
            'confidence': final_confidence,
            'text': transcribed_text if transcribed_text else ""
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
