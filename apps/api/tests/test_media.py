import io
from pathlib import Path

from conftest import API
from PIL import Image

from app.core.config import settings


def png_bytes(size=(2000, 1000), color=(200, 30, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def jpeg_with_gps() -> bytes:
    img = Image.new("RGB", (1200, 800), (10, 120, 200))
    exif = Image.Exif()
    exif[0x010F] = "SecretCam"  # Make
    exif[0x0112] = 6  # Orientation: 90° burilgan
    gps = exif.get_ifd(0x8825)
    gps[1] = "N"
    gps[2] = (41.0, 18.0, 0.0)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


async def upload(c, data: bytes, name: str = "x.png", ctype: str = "image/png", **form):
    return await c.post(f"{API}/media", files={"file": (name, data, ctype)}, data=form)


def stored(url: str) -> Path:
    rel = url.removeprefix(settings.media_url + "/")
    return Path(settings.media_dir) / rel


async def test_upload_png_creates_variants(editor_client):
    c, _ = editor_client
    res = await upload(c, png_bytes(), name="../../etc/passwd.png", alt_uz="Klinika")
    assert res.status_code == 201, res.text
    m = res.json()
    assert m["kind"] == "image" and m["mime"] == "image/webp"
    assert (m["width"], m["height"]) == (2000, 1000)
    assert set(m["srcset"]) == {"480", "960", "1600"}
    assert m["alt"] == {"uz": "Klinika"}
    for url in [m["url"], *m["srcset"].values()]:
        path = stored(url)
        assert path.is_file()
        assert "passwd" not in str(path) and path.suffix == ".webp"
        assert path.parent.name == m["id"].replace("-", "")[:2]
        assert path.name.startswith(m["id"])
    with Image.open(stored(m["srcset"]["480"])) as im:
        assert im.size == (480, 240)


async def test_small_image_not_upscaled(editor_client):
    c, _ = editor_client
    m = (await upload(c, png_bytes((600, 400)))).json()
    assert set(m["srcset"]) == {"480"}
    assert m["width"] == 600


async def test_exif_and_gps_stripped(editor_client):
    c, _ = editor_client
    res = await upload(c, jpeg_with_gps(), name="photo.jpg", ctype="image/jpeg")
    assert res.status_code == 201, res.text
    m = res.json()
    # Orientation qo‘llangan: 1200x800 → 800x1200
    assert (m["width"], m["height"]) == (800, 1200)
    raw = stored(m["url"]).read_bytes()
    assert b"SecretCam" not in raw and b"Exif" not in raw
    with Image.open(stored(m["url"])) as im:
        assert not im.getexif()
        assert "exif" not in im.info and "icc_profile" not in im.info


async def test_text_file_named_png_is_415(editor_client):
    c, _ = editor_client
    res = await upload(c, b"<?php echo 'hi'; ?>" * 10, name="evil.png", ctype="image/png")
    assert res.status_code == 415
    assert res.json()["detail"] == "unsupported_media_type"


async def test_svg_is_415(editor_client):
    c, _ = editor_client
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    res = await upload(c, svg, name="logo.svg", ctype="image/svg+xml")
    assert res.status_code == 415


async def test_truncated_png_is_415(editor_client):
    c, _ = editor_client
    data = png_bytes((300, 300))
    res = await upload(c, data[: len(data) // 2])
    assert res.status_code == 415


async def test_too_large_upload_is_413(editor_client):
    c, _ = editor_client
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (settings.max_upload_mb * 1024 * 1024 + 1)
    res = await upload(c, big)
    assert res.status_code == 413, res.text


async def test_streaming_limit_without_content_length(editor_client, monkeypatch):
    """Chunked so‘rov (Content-Length yo‘q) ham oqim davomida 413 bilan to‘xtatiladi."""
    c, _ = editor_client
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    boundary = "xBOUNDARYx"
    head = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.png\"\r\n"
        "Content-Type: image/png\r\n\r\n"
    ).encode()

    async def gen():
        yield head
        for _ in range(40):
            yield b"0" * 65536
        yield f"\r\n--{boundary}--\r\n".encode()

    res = await c.post(
        f"{API}/media", content=gen(), headers={"content-type": f"multipart/form-data; boundary={boundary}"}
    )
    assert res.status_code == 413, res.text


async def test_decompression_bomb_rejected(editor_client):
    c, _ = editor_client
    buf = io.BytesIO()
    Image.new("1", (7000, 7000)).save(buf, format="PNG")  # 49 MP, lekin fayl kichik
    res = await upload(c, buf.getvalue())
    assert res.status_code == 413, res.text


async def test_pdf_document(editor_client):
    c, _ = editor_client
    pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
    res = await upload(c, pdf, name="litsenziya.pdf", ctype="application/pdf")
    assert res.status_code == 201
    m = res.json()
    assert m["kind"] == "document" and m["mime"] == "application/pdf" and m["srcset"] == {}
    assert "litsenziya" not in m["url"] and m["url"].endswith(".pdf")
    assert stored(m["url"]).read_bytes() == pdf


async def test_media_patch_list_delete_and_in_use(editor_client):
    c, _ = editor_client
    m = (await upload(c, png_bytes((800, 600)))).json()
    res = await c.patch(f"{API}/media/{m['id']}", json={"alt": {"uz": "Rasm", "ru": "Фото"}, "focal_x": 30})
    assert res.status_code == 200 and res.json()["focal_x"] == 30 and res.json()["alt"]["ru"] == "Фото"
    assert (await c.patch(f"{API}/media/{m['id']}", json={"focal_x": 101})).status_code == 422
    assert (await c.patch(f"{API}/media/{m['id']}", json={"alt": {"de": "x"}})).status_code == 422

    page = (await c.get(f"{API}/media", params={"kind": "image"})).json()
    assert page["total"] == 1 and page["items"][0]["id"] == m["id"]

    # Sozlamalarda ishlatilmoqda → 409
    home = {"hero_title": {"uz": "Salom"}, "clinic_image_id": m["id"]}
    assert (await c.put(f"{API}/settings/home", json=home)).status_code == 200
    res = await c.delete(f"{API}/media/{m['id']}")
    assert res.status_code == 409 and res.json()["detail"] == "in_use"

    assert (await c.put(f"{API}/settings/home", json={"hero_title": {"uz": "Salom"}})).status_code == 200
    files = [stored(m["url"]), *(stored(u) for u in m["srcset"].values())]
    assert all(f.is_file() for f in files)
    res = await c.delete(f"{API}/media/{m['id']}")
    assert res.status_code == 204
    assert not any(f.exists() for f in files)
    assert (await c.delete(f"{API}/media/{m['id']}")).status_code == 404
