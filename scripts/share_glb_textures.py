#!/usr/bin/env python3
"""Extract exact embedded image bytes into shared files; write a GLB copy."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import tempfile

MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942
MIME_SUFFIX = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


def read_glb(path: Path):
    raw = path.read_bytes()
    if len(raw) < 28:
        raise ValueError("Truncated GLB")
    magic, version, length = struct.unpack_from("<III", raw)
    if magic != MAGIC or version != 2 or length != len(raw):
        raise ValueError("Expected a complete GLB 2.0 file")
    size, kind = struct.unpack_from("<II", raw, 12)
    if kind != JSON_CHUNK or size % 4 or 28 + size > len(raw):
        raise ValueError("Expected an aligned JSON chunk followed by a BIN chunk")
    doc = json.loads(raw[20:20 + size])
    binary_size, kind = struct.unpack_from("<II", raw, 20 + size)
    if kind != BIN_CHUNK or binary_size % 4 or 28 + size + binary_size != len(raw):
        raise ValueError("Expected one complete aligned BIN chunk")
    if len(doc.get("buffers", [])) != 1 or "uri" in doc["buffers"][0]:
        raise ValueError("Only self-contained single-buffer GLBs are supported")
    declared = doc["buffers"][0]["byteLength"]
    if declared > binary_size or binary_size - declared > 3:
        raise ValueError("Invalid BIN buffer length")
    # These extension structures use byte offsets outside ordinary bufferViews.
    def reject_address_extensions(node):
        if isinstance(node, dict):
            if "EXT_meshopt_compression" in node:
                raise ValueError("Buffer-address extensions require an extension-aware rewrite")
            for value in node.values(): reject_address_extensions(value)
        elif isinstance(node, list):
            for value in node: reject_address_extensions(value)
    reject_address_extensions(doc)
    binary = raw[28 + size:]
    for view in doc.get("bufferViews", []):
        start = view.get("byteOffset", 0)
        if view.get("buffer", 0) != 0 or start < 0 or view["byteLength"] <= 0 or start + view["byteLength"] > declared:
            raise ValueError("Invalid bufferView")
    return raw, doc, binary


def encode_glb(doc, binary):
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary += b"\0" * (-len(binary) % 4)
    return (struct.pack("<III", MAGIC, 2, 28 + len(js) + len(binary))
            + struct.pack("<II", len(js), JSON_CHUNK) + js
            + struct.pack("<II", len(binary), BIN_CHUNK) + binary)


def atomic_write(path: Path, data: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle: handle.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def extract(source: Path, output: Path, texture_dir: Path):
    source, output, texture_dir = source.resolve(), output.resolve(), texture_dir.resolve()
    if source == output:
        raise ValueError("Output must differ from the immutable source GLB")
    if output.exists():
        raise ValueError("Output already exists; choose a new destination")
    raw, doc, binary = read_glb(source)
    # Existing relative/data/external resources need separate relocation rules.
    if any("uri" in image for image in doc.get("images", [])):
        raise ValueError("Input must embed all images; external images are not relocated")
    removed, images_to_write = set(), {}
    views = doc.get("bufferViews", [])
    for image in doc.get("images", []):
        index = image["bufferView"]
        if not 0 <= index < len(views): raise ValueError("Invalid image bufferView")
        suffix = MIME_SUFFIX.get(image.get("mimeType"))
        if not suffix: raise ValueError("Only PNG, JPEG and WebP image bytes are supported")
        view = views[index]
        start = view.get("byteOffset", 0)
        data = binary[start:start + view["byteLength"]]
        name = hashlib.sha256(data).hexdigest() + suffix
        images_to_write[texture_dir / name] = data
        image.pop("bufferView")
        image["uri"] = Path(os.path.relpath(texture_dir / name, output.parent)).as_posix()
        removed.add(index)
    mapping, chunks, offset, retained = {}, [], 0, []
    for index, view in enumerate(views):
        if index in removed: continue
        start = view.get("byteOffset", 0)
        chunk = binary[start:start + view["byteLength"]]
        mapping[index] = len(retained)
        retained.append({**view, "byteOffset": offset})
        chunk += b"\0" * (-len(chunk) % 4)
        chunks.append(chunk)
        offset += len(chunk)
    if not retained:
        raise ValueError("Expected retained geometry or animation bufferViews after image extraction")
    doc["bufferViews"] = retained
    def remap(node):
        if isinstance(node, dict):
            for key, value in list(node.items()):
                if key == "bufferView":
                    if value not in mapping: raise ValueError("Image view is also referenced by non-image data")
                    node[key] = mapping[value]
                else: remap(value)
        elif isinstance(node, list):
            for value in node: remap(value)
    remap(doc)
    data = b"".join(chunks)
    doc["buffers"][0]["byteLength"] = len(data)
    rewritten = encode_glb(doc, data)
    # Every structural check happens before writing any destination file.
    for image_path, data in images_to_write.items():
        if image_path.exists():
            if image_path.read_bytes() != data: raise ValueError("Existing shared texture does not match its hash")
        else: atomic_write(image_path, data)
    atomic_write(output, rewritten)
    return {"source_sha256": hashlib.sha256(raw).hexdigest(), "output_bytes": len(rewritten),
            "shared_images": len(images_to_write), "output": str(output)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--texture-dir", type=Path, required=True)
    args = parser.parse_args()
    try: result = extract(args.source, args.output, args.texture_dir)
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as exc: parser.exit(1, f"Cannot rewrite GLB: {exc}\n")
    print(json.dumps(result, indent=2))

if __name__ == "__main__": main()
