"""
Extract id, text, label from TESS dataset.
Uses Whisper for speech-to-text.

  pip install openai-whisper

Output: CSV with columns id, text, label (and optional path for multimodal use).
Example: python extract_tess_text_dataset.py --tess-dir ./tess_dataset --output tess_text_dataset.csv --include-path
"""

import os
import csv
import argparse

try:
    from urllib.error import URLError
except ImportError:
    URLError = OSError  # Python 2

# TESS label from filename: e.g. OAF_back_angry.wav -> angry
def get_label_from_filename(filename: str) -> str:
    stem = os.path.splitext(filename)[0]
    return stem.split("_")[-1].lower()


def collect_tess_files(tess_dir: str):
    """Collect all .wav paths and labels from tess_dir."""
    rows = []
    for root, _, filenames in os.walk(tess_dir):
        for f in filenames:
            if not f.lower().endswith(".wav"):
                continue
            path = os.path.join(root, f)
            label = get_label_from_filename(f)
            # id = filename without extension (unique per file)
            id_ = os.path.splitext(f)[0]
            rows.append((id_, path, label))
    return rows


def load_audio_for_whisper(audio_path: str):
    """Load WAV as float32 16kHz mono (no ffmpeg). Use librosa to avoid WinError 2 when ffmpeg is missing."""
    import numpy as np
    try:
        import librosa
    except ImportError:
        return None
    y, sr = librosa.load(audio_path, sr=16000, mono=True)
    return y.astype(np.float32)


def transcribe_with_whisper(audio_path: str, model):
    """Transcribe a single audio file. Load with librosa to avoid ffmpeg dependency."""
    audio = load_audio_for_whisper(audio_path)
    if audio is None:
        # Fallback: let Whisper load (needs ffmpeg)
        result = model.transcribe(audio_path, fp16=False)
    else:
        # Whisper expects 16kHz float32; pad/trim to 30s
        import whisper
        audio = whisper.pad_or_trim(audio)
        result = model.transcribe(audio, fp16=False)
    return (result.get("text") or "").strip()


def main():
    parser = argparse.ArgumentParser(description="Extract id, text, label from TESS dataset")
    parser.add_argument(
        "--tess-dir",
        default=os.path.join(os.path.dirname(__file__), "tess_dataset"),
        help="Path to TESS dataset folder (default: ./tess_dataset)",
    )
    parser.add_argument(
        "--output",
        default=os.path.join(os.path.dirname(__file__), "tess_text_dataset.csv"),
        help="Output CSV path (default: ./tess_text_dataset.csv)",
    )
    parser.add_argument(
        "--include-path",
        action="store_true",
        help="Add 'path' column with audio file path (for multimodal)",
    )
    parser.add_argument(
        "--whisper-model",
        default="base",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size (default: base). Larger = more accurate, slower.",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=None,
        help="Max number of files to process (default: all). Useful for testing.",
    )
    parser.add_argument(
        "--whisper-download-root",
        default=None,
        help="Directory where Whisper model is (or should be) stored. Use this for offline: copy the folder from another PC's %%USERPROFILE%%\\.cache\\whisper here and pass this path.",
    )
    args = parser.parse_args()

    tess_dir = os.path.abspath(args.tess_dir)
    if not os.path.isdir(tess_dir):
        print(f"Error: TESS directory not found: {tess_dir}")
        return 1

    rows = collect_tess_files(tess_dir)
    if args.max_files is not None:
        rows = rows[: args.max_files]
    print(f"Found {len(rows)} WAV files in {tess_dir}")

    try:
        import whisper
    except ImportError:
        print("Whisper not installed. Run: pip install openai-whisper")
        print("Writing CSV with id and label only (text empty).")
        model = None
    else:
        download_root = None
        if args.whisper_download_root:
            download_root = os.path.abspath(args.whisper_download_root)
            if not os.path.isdir(download_root):
                print(f"Error: --whisper-download-root is not a directory: {download_root}")
                return 1
            model_file = os.path.join(download_root, f"{args.whisper_model}.pt")
            if not os.path.isfile(model_file):
                print(f"Error: Model file not found at {model_file}")
                print("  On a machine with internet, run: python -c \"import whisper; whisper.load_model('base')\"")
                print("  Then copy the folder (e.g. %%USERPROFILE%%\\.cache\\whisper) to this PC and pass it with --whisper-download-root.")
                return 1
        print(f"Loading Whisper model '{args.whisper_model}'...")
        try:
            model = whisper.load_model(args.whisper_model, download_root=download_root)
        except URLError as e:
            print("Network error: could not download Whisper model (no internet or DNS failure).")
            print("To run offline:")
            print("  1. On a machine WITH internet, run: python -c \"import whisper; whisper.load_model('base')\"")
            print("  2. Copy the folder (Windows: %USERPROFILE%\\.cache\\whisper) to this PC.")
            print("  3. Run this script with: --whisper-download-root=<path to that whisper folder>")
            return 1
        except Exception as e:
            err = str(e).lower()
            if "getaddrinfo" in err or "urlopen" in err or "11001" in err:
                print("Network error: could not download Whisper model (no internet or DNS failure).")
                print("To run offline:")
                print("  1. On a machine WITH internet, run: python -c \"import whisper; whisper.load_model('base')\"")
                print("  2. Copy the folder (Windows: %USERPROFILE%\\.cache\\whisper) to this PC.")
                print("  3. Run this script with: --whisper-download-root=<path to that whisper folder>")
                return 1
            raise

    fieldnames = ["id", "text", "label"]
    if args.include_path:
        fieldnames.append("path")

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for i, (id_, path, label) in enumerate(rows):
            if model is not None:
                try:
                    text = transcribe_with_whisper(path, model)
                except Exception as e:
                    print(f"Warning: failed to transcribe {path}: {e}")
                    text = ""
            else:
                text = ""
            row = {"id": id_, "text": text, "label": label}
            if args.include_path:
                row["path"] = path
            writer.writerow(row)
            if (i + 1) % 100 == 0:
                print(f"Processed {i + 1}/{len(rows)}")

    print(f"Done. Wrote {len(rows)} rows to {args.output}")
    return 0


if __name__ == "__main__":
    exit(main())
