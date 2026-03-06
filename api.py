from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import time
import tempfile

# Allow importing use_model and use_voice_model from scripts/
_project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_project_root, 'scripts'))

from use_model import EmotionPredictor
from use_voice_model import VoiceEmotionPredictor

frontend_dist_dir = os.path.join(_project_root, 'frontend', 'dist')
app = Flask(__name__, static_folder=frontend_dist_dir, static_url_path='')
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# Initialize the text emotion predictor
project_root = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(project_root, 'models')

# Text Model Paths
text_model_path = os.path.join(models_dir, 'emotion_cnn_bilstm_model.keras')
tokenizer_path = os.path.join(models_dir, 'tokenizer.pkl')
label_encoder_path = os.path.join(models_dir, 'label_encoder.pkl')

# Voice Model Paths
voice_model_path = os.path.join(models_dir, 'anvitha_voice_emotion_model.h5')
voice_scaler_path = os.path.join(models_dir, 'scaler.pkl')
voice_encoder_path = os.path.join(models_dir, 'encoder.pkl')


def validate_required_files():
    required_files = {
        'text model': text_model_path,
        'text tokenizer': tokenizer_path,
        'text label encoder': label_encoder_path,
        'voice model': voice_model_path,
        'voice encoder': voice_encoder_path,
    }
    missing = [f"{name}: {path}" for name, path in required_files.items() if not os.path.exists(path)]
    if missing:
        raise FileNotFoundError(
            "Missing required model assets. Add these files to the deployment or download them during build:\n"
            + "\n".join(missing)
        )


validate_required_files()

print(f"Loading text model from {text_model_path}...")
text_predictor = EmotionPredictor(
    model_path=text_model_path,
    tokenizer_path=tokenizer_path,
    label_encoder_path=label_encoder_path
)

print(f"Loading voice model from {voice_model_path}...")
voice_predictor = VoiceEmotionPredictor(
    model_path=voice_model_path,
    scaler_path=voice_scaler_path,
    encoder_path=voice_encoder_path
)


def warm_up_models():
    # Pre-run a lightweight inference so the first real request
    # does not pay TensorFlow's full initialization cost.
    try:
        print("Warming up text model...")
        text_predictor.predict("hello")
        print("✓ Text model warm-up completed")
    except Exception as e:
        print(f"Text model warm-up skipped: {e}")


warm_up_models()

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        print(f"Analyzing text: {text[:50]}...")
        
        # Predict emotion
        start_time = time.time()
        result = text_predictor.predict(text)
        end_time = time.time()
        time_ms = round((end_time - start_time) * 1000, 2)
        result['time_ms'] = time_ms
        result['type'] = 'text'
        result.pop('confidence', None)  # don't send confidence to UI
        return jsonify(result)
    
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-voice', methods=['POST'])
def predict_voice():
    temp_path = None
    converted_path = None
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        fd, temp_path = tempfile.mkstemp(suffix='.audio')
        os.close(fd)
        audio_file.save(temp_path)
        print(f"Analyzing voice sample: {temp_path}")

        path_to_use = temp_path
        try:
            start_time = time.time()
            result = voice_predictor.predict(path_to_use)
            end_time = time.time()
        except Exception as e:
            err_msg = str(type(e).__name__) + (str(e) or '')
            if 'Format not recognised' not in err_msg and 'NoBackendError' not in err_msg and 'LibsndfileError' not in err_msg:
                raise
            try:
                from pydub import AudioSegment
                converted_path = temp_path + '.wav'
                AudioSegment.from_file(temp_path).export(converted_path, format='wav')
                path_to_use = converted_path
                start_time = time.time()
                result = voice_predictor.predict(path_to_use)
                end_time = time.time()
            except ImportError:
                raise ValueError(
                    'Unsupported audio format. Use a modern browser (Chrome/Edge) so recording is sent as WAV, '
                    'or install pydub and ffmpeg for server-side conversion.'
                ) from e
            except Exception as conv_e:
                raise ValueError(
                    'Could not convert audio. Install ffmpeg and pydub, or try again in Chrome/Edge.'
                ) from conv_e

        time_ms = round((end_time - start_time) * 1000, 2)
        result['time_ms'] = time_ms
        result['type'] = 'voice'
        result.pop('confidence', None)  # don't send confidence to UI
        return jsonify(result)
    
    except Exception as e:
        print(f"Error during voice prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        for p in (converted_path, temp_path):
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except OSError:
                    pass

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy', 
        'text_model_loaded': text_predictor.model is not None,
        'voice_model_loaded': voice_predictor.model is not None
    })


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if not app.static_folder or not os.path.isdir(app.static_folder):
        return jsonify({
            'error': 'Frontend build not found. Run "npm --prefix frontend run build" before starting the server.'
        }), 503

    requested_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(requested_path) and os.path.isfile(requested_path):
        return send_from_directory(app.static_folder, path)

    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    print(f"Starting Emotion Analysis API on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
