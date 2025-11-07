import os
from pathlib import Path
from PIL import Image

SOURCE_DIR = r"/PATHVERSLEDOSSIERDIMAGE"  

OUTPUT_DIR = Path(SOURCE_DIR) / "resized_30x30"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}

def is_image_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTS

def resize_to_30x30(src: Path, dst: Path):
    with Image.open(src) as im:
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if src.suffix.lower() in {".png", ".webp"} else "RGB")
        resized = im.resize((30, 30), Image.LANCZOS)

        save_kwargs = {}
        ext = dst.suffix.lower()
        if ext in {".jpg", ".jpeg"}:
            save_kwargs.update({"quality": 90, "optimize": True})
            if resized.mode == "RGBA":
                resized = resized.convert("RGB") 
        elif ext in {".png"}:
            save_kwargs.update({"optimize": True})
        elif ext in {".webp"}:
            save_kwargs.update({"method": 6})

        resized.save(dst, **save_kwargs)

def main():
    src_dir = Path(SOURCE_DIR)
    if not src_dir.exists():
        print(f"Le dossier source n'existe pas : {src_dir}")
        return

    count = 0
    for entry in src_dir.iterdir():
        if not is_image_file(entry):
            continue
        out_path = OUTPUT_DIR / entry.name
        try:
            resize_to_30x30(entry, out_path)
            count += 1
            print(f"OK: {entry.name} -> {out_path}")
        except Exception as e:
            print(f"ERREUR: {entry.name} -> {e}")

    print(f"Terminé. {count} image(s) convertie(s) dans {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
