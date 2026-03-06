import os
import random
import shutil

root = r"e:\project\anvitha-updated\TESS Toronto emotional speech set data"
out_dir = r"e:\project\anvitha-updated\tess_dataset"

os.makedirs(out_dir, exist_ok=True)
all_wav = [os.path.join(r, f) for r, _, files in os.walk(root) for f in files if f.lower().endswith('.wav')]
random.shuffle(all_wav)
for path in all_wav:
    shutil.copy2(path, os.path.join(out_dir, os.path.basename(path)))
print(f"Copied {len(all_wav)} files to {out_dir}")