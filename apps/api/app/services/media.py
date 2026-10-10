"""Yuklangan fayllarni xavfsiz qayta ishlash.

- Faqat JPEG/PNG/WebP (rasm) va PDF (hujjat). Tur fayl nomi/Content-Type'dan emas, magic bytes'dan aniqlanadi.
- Rasm: Pillow verify → qayta ochish → EXIF orientatsiyasi qo‘llanadi → EXIF/GPS/ICC'siz WebP qilib qayta kodlanadi.
- Decompression bomb: 40 MP dan katta rasm rad etiladi.
- Fayl nomi tasodifiy (uuid); foydalanuvchi bergan nom hech qayerda ishlatilmaydi.
"""

import io
import uuid
import warnings
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

Image.MAX_IMAGE_PIXELS = 40_000_000
WIDTHS = (480, 960, 1600)
CHUNK = 64 * 1024
WEBP_QUALITY = 82

_IMAGE_FORMATS = {"jpeg": "JPEG", "png": "PNG", "webp": "WEBP"}


@dataclass
class Stored:
    kind: str  # image | document
    mime: str
    size: int
    width: int | None = None
    height: int | None = None
    variants: dict[str, str] = field(default_factory=dict)


def unsupported() -> HTTPException:
    return HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "unsupported_media_type")


def too_large() -> HTTPException:
    return HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "too_large")


def max_bytes() -> int:
    return settings.max_upload_mb * 1024 * 1024


async def read_limited(upload: UploadFile, limit: int | None = None) -> bytes:
    """UploadFile'ni bo‘laklab o‘qiydi; limitdan oshsa darhol 413."""
    limit = limit or max_bytes()
    buf = bytearray()
    while chunk := await upload.read(CHUNK):
        buf += chunk
        if len(buf) > limit:
            raise too_large()
    return bytes(buf)


def sniff(data: bytes) -> str | None:
    """Magic bytes bo‘yicha tur: jpeg | png | webp | pdf | None."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:5] == b"%PDF-":
        return "pdf"
    return None


def _root() -> Path:
    return Path(settings.media_dir).resolve()


def _rel(file_id: uuid.UUID, suffix: str) -> str:
    return f"{file_id.hex[:2]}/{file_id}-{suffix}"


def _write(rel: str, data: bytes) -> None:
    path = _root() / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _decode(data: bytes, kind: str) -> Image.Image:
    """Ikki bosqich: verify() (struktura) → qayta ochib to‘liq yuklash. Har qanday xato — 415."""
    with warnings.catch_warnings():
        # 40 MP dan oshsa Pillow ogohlantiradi (2× da xato) — ogohlantirishni ham xato deb olamiz
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        try:
            with Image.open(io.BytesIO(data)) as probe:
                if probe.format != _IMAGE_FORMATS[kind]:
                    raise unsupported()
                w, h = probe.size
                if w * h > Image.MAX_IMAGE_PIXELS:
                    raise too_large()
                probe.verify()
            img = Image.open(io.BytesIO(data))
            img.load()
        except (Image.DecompressionBombError, Image.DecompressionBombWarning) as e:
            raise too_large() from e
        except HTTPException:
            raise
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as e:
            raise unsupported() from e
    return img


def _process_image(data: bytes, kind: str, file_id: uuid.UUID) -> Stored:
    img = _decode(data, kind)
    try:
        # Orientatsiyani piksellarga qo‘llaymiz, keyin metadata'siz yangi rasm (EXIF/GPS/XMP/ICC o‘chadi)
        img = ImageOps.exif_transpose(img)
        mode = "RGBA" if img.mode in ("RGBA", "LA", "PA") or "transparency" in img.info else "RGB"
        clean = img.convert(mode)
    except (OSError, ValueError) as e:
        raise unsupported() from e
    width, height = clean.size

    def encode(im: Image.Image) -> bytes:
        out = io.BytesIO()
        im.save(out, format="WEBP", quality=WEBP_QUALITY, method=4)  # exif/icc berilmaydi
        return out.getvalue()

    variants: dict[str, str] = {}
    written: list[tuple[str, bytes]] = []
    for w in WIDTHS:
        if w >= width:  # asl o‘lchamdan kattalashtirilmaydi
            continue
        h = max(1, round(height * w / width))
        rel = _rel(file_id, f"{w}.webp")
        written.append((rel, encode(clean.resize((w, h), Image.Resampling.LANCZOS))))
        variants[str(w)] = rel
    original = encode(clean)
    rel = _rel(file_id, f"{width}.webp")
    written.append((rel, original))
    variants["original"] = rel

    for path, blob in written:
        _write(path, blob)
    return Stored(kind="image", mime="image/webp", size=len(original), width=width, height=height, variants=variants)


def process(data: bytes, file_id: uuid.UUID) -> Stored:
    """Sinxron (CPU) — chaqiruvchi threadpool'da ishlatadi."""
    if len(data) > max_bytes():
        raise too_large()
    kind = sniff(data)
    if kind is None:
        raise unsupported()
    if kind == "pdf":
        rel = _rel(file_id, "doc.pdf")
        _write(rel, data)
        return Stored(kind="document", mime="application/pdf", size=len(data), variants={"original": rel})
    return _process_image(data, kind, file_id)


def delete_files(variants: dict[str, str]) -> None:
    root = _root()
    for rel in set((variants or {}).values()):
        path = (root / rel).resolve()
        # Faqat media papkasi ichidagi fayllar o‘chiriladi
        if path.is_relative_to(root) and path.is_file():
            path.unlink(missing_ok=True)
