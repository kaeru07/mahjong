#!/usr/bin/env python3
"""スクリーンショット / 写真を問題化用の JPEG へ正規化する。

    /root/.venvs/heic/bin/python scripts/prepare-images.py [--batch <name>] [--force]

inputdata/ 配下（サブフォルダ可）の HEIC / PNG / JPEG を走査し、converted/ に
同じ階層構造で JPEG を書き出す。既に変換済みのものは skip する。
変換結果は converted/_manifest.json に記録し、data/questions.json の
sourceImages と突き合わせて「まだ問題化していない画像」を一覧する。

HEIC を読むには pillow-heif が要る（/root/.venvs/heic）。PNG/JPEG だけなら
システムの python3 でも動く。
"""

import argparse
import hashlib
import json
import os
import sys

from PIL import Image

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.environ.get("IMAGE_SRC_DIR") or os.path.join(ROOT, "inputdata")
OUT_DIR = os.environ.get("IMAGE_OUT_DIR") or os.path.join(ROOT, "converted")
MANIFEST = os.path.join(OUT_DIR, "_manifest.json")
QUESTIONS = os.path.join(ROOT, "data", "questions.json")

SRC_EXT = {".heic", ".heif", ".png", ".jpg", ".jpeg"}
MAX_EDGE = 2400  # 牌の判読に足りる範囲で縮小する
JPEG_QUALITY = 88


def iter_sources(batch=None):
    base = os.path.join(SRC_DIR, batch) if batch else SRC_DIR
    for dirpath, _dirnames, filenames in os.walk(base):
        for name in sorted(filenames):
            if name.startswith("."):
                continue
            if os.path.splitext(name)[1].lower() in SRC_EXT:
                yield os.path.join(dirpath, name)


def sha1_of(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


def convert(src, force=False):
    rel = os.path.relpath(src, SRC_DIR)
    out_rel = os.path.splitext(rel)[0] + ".jpg"
    out = os.path.join(OUT_DIR, out_rel)

    if os.path.exists(out) and not force:
        with Image.open(out) as im:
            size = im.size
        return out_rel, size, "skip"

    ext = os.path.splitext(src)[1].lower()
    if ext in (".heic", ".heif") and not HEIC_OK:
        return out_rel, None, "no-heic-support"

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB")
        if max(im.size) > MAX_EDGE:
            scale = MAX_EDGE / max(im.size)
            im = im.resize(
                (round(im.width * scale), round(im.height * scale)),
                Image.LANCZOS,
            )
        im.save(out, "JPEG", quality=JPEG_QUALITY, optimize=True)
        size = im.size
    return out_rel, size, "converted"


def used_images():
    """data/questions.json が既に出典として参照している画像名。"""
    if not os.path.exists(QUESTIONS):
        return set()
    with open(QUESTIONS, encoding="utf-8") as f:
        data = json.load(f)
    used = set()
    for q in data:
        for name in q.get("sourceImages") or []:
            used.add(os.path.basename(str(name)))
    return used


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", help="inputdata/<batch>/ だけを処理する")
    ap.add_argument("--force", action="store_true", help="変換済みでも上書きする")
    args = ap.parse_args()

    if not os.path.isdir(SRC_DIR):
        sys.exit(f"入力フォルダがない: {SRC_DIR}")

    os.makedirs(OUT_DIR, exist_ok=True)

    entries = []
    counts = {"converted": 0, "skip": 0, "no-heic-support": 0}
    seen_hash = {}
    dupes = []

    for src in iter_sources(args.batch):
        out_rel, size, status = convert(src, force=args.force)
        counts[status] = counts.get(status, 0) + 1
        digest = sha1_of(src)
        if digest in seen_hash:
            dupes.append((out_rel, seen_hash[digest]))
        else:
            seen_hash[digest] = out_rel
        entries.append(
            {
                "source": os.path.relpath(src, ROOT),
                "image": out_rel,
                "batch": os.path.dirname(os.path.relpath(src, SRC_DIR)) or "(root)",
                "width": size[0] if size else None,
                "height": size[1] if size else None,
                "sha1": digest,
                "status": status,
            }
        )

    used = used_images()
    for e in entries:
        e["usedInQuestions"] = os.path.basename(e["image"]) in used

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(
            {"generatedAt": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
             "count": len(entries),
             "images": entries},
            f,
            ensure_ascii=False,
            indent=2,
        )

    pending = [e for e in entries if not e["usedInQuestions"] and e["status"] != "no-heic-support"]

    print(f"走査: {len(entries)} 件 / 変換 {counts['converted']} / skip {counts['skip']}", end="")
    if counts.get("no-heic-support"):
        print(f" / HEIC未対応でスキップ {counts['no-heic-support']}", end="")
    print()
    if dupes:
        print(f"同一内容の重複: {len(dupes)} 件")
        for a, b in dupes[:10]:
            print(f"  {a} == {b}")
    print(f"未問題化（sourceImages 未参照）: {len(pending)} 件")
    for e in pending[:40]:
        print(f"  {e['image']}  {e['width']}x{e['height']}")
    if len(pending) > 40:
        print(f"  ... 他 {len(pending) - 40} 件")
    print(f"manifest: {os.path.relpath(MANIFEST, ROOT)}")


if __name__ == "__main__":
    main()
