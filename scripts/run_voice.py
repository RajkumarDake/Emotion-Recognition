"""
Voice emotion prediction - terminal script.
Provide an audio filename; the script finds it in tess_dataset, loads it, and prints the predicted emotion.
"""

import os
import sys

# Project root (parent of scripts/)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_script_dir)
sys.path.insert(0, _script_dir)

TESS_DATASET_DIR = os.path.join(_project_root, 'tess_dataset')

from use_voice_model import VoiceEmotionPredictor

# Model paths (project root / models)
MODELS_DIR = os.path.join(_project_root, 'models')
VOICE_MODEL_PATH = os.path.join(MODELS_DIR, 'anvitha_voice_emotion_model.h5')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.pkl')
ENCODER_PATH = os.path.join(MODELS_DIR, 'encoder.pkl')


def find_audio_in_tess(filename):
    """Find an audio file in tess_dataset by name (with or without .wav)."""
    name = filename.strip()
    if not name.lower().endswith('.wav'):
        name = name + '.wav'
    path = os.path.join(TESS_DATASET_DIR, name)
    if os.path.isfile(path):
        return path
    # Try case-insensitive search if exact match fails
    if not os.path.isdir(TESS_DATASET_DIR):
        return None
    for f in os.listdir(TESS_DATASET_DIR):
        if f.lower() == name.lower():
            return os.path.join(TESS_DATASET_DIR, f)
    return None


def main():
    if not os.path.isdir(TESS_DATASET_DIR):
        print(f"Error: tess_dataset folder not found at {TESS_DATASET_DIR}")
        sys.exit(1)

    print("Loading voice emotion model...")
    predictor = VoiceEmotionPredictor(
        model_path=VOICE_MODEL_PATH,
        scaler_path=SCALER_PATH,
        encoder_path=ENCODER_PATH
    )
    # Warm-up: first prediction is slow; run on one file so the next ones are fast
    first_wav = None
    for f in os.listdir(TESS_DATASET_DIR):
        if f.lower().endswith('.wav'):
            first_wav = os.path.join(TESS_DATASET_DIR, f)
            break
    if first_wav:
        predictor.predict(first_wav)
    print("Model ready.\n")
    print("Enter an audio filename from tess_dataset (e.g. OAF_back_angry.wav or OAF_back_angry):")
    print("-" * 50)

    while True:
        try:
            filename = input(">>> ").strip()
            if filename.lower() in ('quit', 'exit', 'q'):
                print("Goodbye.")
                break
            if not filename:
                continue

            audio_path = find_audio_in_tess(filename)
            if not audio_path:
                print(f"File not found in tess_dataset: {filename}\n")
                continue

            result = predictor.predict(audio_path)
            print(f"File: {os.path.basename(audio_path)}")
            print(f"Emotion: {result['emotion']}\n")
        except KeyboardInterrupt:
            print("\nGoodbye.")
            break
        except Exception as e:
            print(f"Error: {e}\n")


if __name__ == "__main__":
    main()
