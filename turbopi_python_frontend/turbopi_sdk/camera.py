from typing import Any, Dict, Optional

from .http import http_post_json


def snapshot(width: Optional[int] = None, height: Optional[int] = None, quality: Optional[int] = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {}
    if width is not None:
        body["width"] = int(width)
    if height is not None:
        body["height"] = int(height)
    if quality is not None:
        body["quality"] = int(quality)
    return http_post_json("/api/v1/camera/snapshot", body)