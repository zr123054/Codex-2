from __future__ import annotations

import os
from typing import Any

from flask import Flask, jsonify, render_template, request
from yt_dlp import YoutubeDL

app = Flask(__name__)


def extract_formats(video_url: str) -> dict[str, Any]:
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=False)

    formats = []
    for fmt in info.get("formats", []):
        # Keep combined audio+video formats so the output URL is a single playable file.
        if fmt.get("vcodec") == "none" or fmt.get("acodec") == "none":
            continue
        if not fmt.get("url"):
            continue

        height = fmt.get("height")
        quality = f"{height}p" if height else (fmt.get("format_note") or "unknown")
        ext = fmt.get("ext") or "mp4"
        filesize = fmt.get("filesize") or fmt.get("filesize_approx")
        size_mb = f"{filesize / (1024 * 1024):.1f} MB" if filesize else "未知"

        formats.append(
            {
                "format_id": fmt.get("format_id"),
                "quality": quality,
                "ext": ext,
                "size": size_mb,
                "fps": fmt.get("fps"),
                "url": fmt.get("url"),
            }
        )

    # Deduplicate by format id and sort by quality height descending when possible.
    unique = {f["format_id"]: f for f in formats}.values()
    sorted_formats = sorted(
        unique,
        key=lambda x: int(str(x["quality"]).replace("p", "")) if str(x["quality"]).endswith("p") and str(x["quality"]).replace("p", "").isdigit() else 0,
        reverse=True,
    )

    return {
        "title": info.get("title"),
        "thumbnail": info.get("thumbnail"),
        "formats": sorted_formats,
    }


@app.get("/")
def index() -> str:
    return render_template("index.html")


@app.post("/api/formats")
def get_formats():
    payload = request.get_json(silent=True) or {}
    video_url = payload.get("url", "").strip()
    if not video_url:
        return jsonify({"error": "请先输入 YouTube 链接"}), 400

    try:
        data = extract_formats(video_url)
        if not data["formats"]:
            return jsonify({"error": "未找到可直接下载的音视频合并格式"}), 404
        return jsonify(data)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"解析失败: {exc}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port)
