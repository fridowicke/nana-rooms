"""Create 2K phone variants, preserving every non-image buffer byte and metadata."""
import importlib.util
from pathlib import Path
import json

spec = importlib.util.spec_from_file_location('resize_models', Path(__file__).with_name('resize-room-textures.py'))
resize_models = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resize_models)

sources = [(Path('public/assets/home.glb'), Path('public/assets/home-mobile.glb'), 8192)]
sources.extend((path, path.parent / 'mobile' / path.name, 4096) for path in sorted(Path('public/rooms').glob('*.glb')))
rows = []
for source, destination, source_size in sources:
    original = source.read_bytes()
    result = resize_models.resize(original, 2048, 90, source_size=source_size)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(result)
    rows.append({'file': str(destination), 'beforeMB': round(len(original) / 1024**2, 2), 'afterMB': round(len(result) / 1024**2, 2), 'geometry': 'unchanged'})
print(json.dumps(rows, indent=2))
