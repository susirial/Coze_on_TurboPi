from typing import Any, Dict

from .http import http_post_multipart


def upload_file(file_path: str) -> Dict[str, Any]:
    with open(file_path, "rb") as f:
        data = f.read()
    files = {
        "file": (file_path.split("/")[-1] or "upload.bin", data, "application/octet-stream"),
    }
    return http_post_multipart("/api/v1/coze/files/upload", files=files)