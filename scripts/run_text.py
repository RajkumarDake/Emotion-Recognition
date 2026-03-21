"""
Text emotion prediction - terminal script.
"""

import os
import sys

# Project root (parent of scripts/)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_script_dir)
sys.path.insert(0, _script_dir)

from use_model import EmotionPredictor

# Model paths (project root / models)
MODELS_DIR = os.path.join(_project_root, 'models')
TEXT_MODEL_PATH = os.path.join(MODELS_DIR, 'emotion_cnn_bilstm_model.keras')
TOKENIZER_PATH = os.path.join(MODELS_DIR, 'tokenizer.pkl')
LABEL_ENCODER_PATH = os.path.join(MODELS_DIR, 'label_encoder.pkl')


def main():
    # Use pretrained model (same as API). Load Keras only if files exist (for fallback).
    has_keras = (
        os.path.exists(TEXT_MODEL_PATH)
        and os.path.exists(TOKENIZER_PATH)
        and os.path.exists(LABEL_ENCODER_PATH)
    )
    if has_keras:
        predictor = EmotionPredictor(
            model_path=TEXT_MODEL_PATH,
            tokenizer_path=TOKENIZER_PATH,
            label_encoder_path=LABEL_ENCODER_PATH,
        )
    else:
        predictor = EmotionPredictor()

    # Warm-up: first prediction loads pretrained model and is slow
    predictor.predict("hello")
    print("Ready.\n")
    print("Enter text to analyze (or 'quit' / 'exit' to stop):")
    print("-" * 50)

    while True:
        try:
            text = input(">>> ").strip()
            if text.lower() in ('quit', 'exit', 'q'):
                print("Goodbye.")
                break
            if not text:
                continue
            result = predictor.predict(text)
            print(f"Emotion: {result['emotion']}")
            print(f"Time: {result['time_ms']} ms\n")
        except KeyboardInterrupt:
            print("\nGoodbye.")
            break
        except Exception as e:
            print(f"Error: {e}\n")


if __name__ == "__main__":
    main()
