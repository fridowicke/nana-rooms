"""Resize embedded room JPEGs without changing any geometry/accessor bytes.

Requires Pillow. Run against original scans from Git, not already downsized files:
  python3 scripts/resize-room-textures.py --write
Without --write, prints estimated sizes without modifying files.
"""
from pathlib import Path
import argparse
import io
import json
import struct
from PIL import Image


def unpack_glb(data):
    magic, version, total = struct.unpack_from('<III', data)
    assert magic == 0x46546C67 and version == 2 and total == len(data), 'Invalid GLB header'
    json_size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A, 'Missing JSON chunk'
    doc = json.loads(data[20:20 + json_size])
    bin_size, kind = struct.unpack_from('<II', data, 20 + json_size)
    assert kind == 0x004E4942 and 28 + json_size + bin_size == total, 'Expected one BIN chunk'
    return doc, data[28 + json_size:]


def resize(data, size, quality):
    doc, old_binary = unpack_glb(data)
    assert len(doc['buffers']) == 1 and not doc.get('extensionsUsed'), 'Expected a self-contained, uncompressed scan'
    assert len(doc['images']) == 1 and doc['images'][0]['mimeType'] == 'image/jpeg', 'Expected one embedded JPEG'
    image_view = doc['images'][0]['bufferView']
    new_binary = bytearray()
    for index, view in enumerate(doc['bufferViews']):
        assert view['buffer'] == 0
        offset = view.get('byteOffset', 0)
        payload = old_binary[offset:offset + view['byteLength']]
        if index == image_view:
            image = Image.open(io.BytesIO(payload))
            assert image.size == (8192, 8192), 'Use the original 8K scan; do not recompress an optimized file'
            out = io.BytesIO()
            image.resize((size, size), Image.Resampling.LANCZOS).save(out, 'JPEG', quality=quality, optimize=True)
            payload = out.getvalue()
        new_binary.extend(b'\0' * (-len(new_binary) % 4))
        view['byteOffset'] = len(new_binary)
        view['byteLength'] = len(payload)
        new_binary.extend(payload)
    doc['buffers'][0]['byteLength'] = len(new_binary)
    text = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    text += b' ' * (-len(text) % 4)
    new_binary.extend(b'\0' * (-len(new_binary) % 4))
    total = 28 + len(text) + len(new_binary)
    result = struct.pack('<IIIII', 0x46546C67, 2, total, len(text), 0x4E4F534A) + text
    result += struct.pack('<II', len(new_binary), 0x004E4942) + new_binary
    verify_geometry(data, result)
    return result


def verify_geometry(before, after):
    old, old_binary = unpack_glb(before)
    new, new_binary = unpack_glb(after)
    image_view = old['images'][0]['bufferView']
    for index, (old_view, new_view) in enumerate(zip(old['bufferViews'], new['bufferViews'])):
        if index != image_view:
            a = old_view.get('byteOffset', 0)
            b = new_view.get('byteOffset', 0)
            assert old_binary[a:a + old_view['byteLength']] == new_binary[b:b + new_view['byteLength']], 'Geometry changed'
        old_view.pop('byteOffset', None)
        new_view.pop('byteOffset', None)
        if index == image_view:
            old_view.pop('byteLength')
            new_view.pop('byteLength')
    old['buffers'][0].pop('byteLength')
    new['buffers'][0].pop('byteLength')
    assert old == new, 'Non-texture GLB metadata changed'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path('public/rooms'))
    parser.add_argument('--size', type=int, default=4096)
    parser.add_argument('--quality', type=int, default=90)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    assert 1 <= args.size <= 8192 and 1 <= args.quality <= 100
    rows = []
    for path in sorted(args.directory.glob('*.glb')):
        original = path.read_bytes()
        optimized = resize(original, args.size, args.quality)
        if args.write:
            path.write_bytes(optimized)
        rows.append({'file': path.name, 'beforeBytes': len(original), 'afterBytes': len(optimized)})
    print(json.dumps(rows, indent=2))
