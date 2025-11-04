from typing import Any, Dict, Iterable, Optional, Tuple

from .http import iter_sse_events


def image_chat_stream(
    text: str,
    bot_id: str,
    file_path: Optional[str] = None,
    user_id: str = "user id",
    conversation_id: Optional[str] = None,
) -> Iterable[Dict[str, Any]]:
    fields = {
        "text": text,
        "bot_id": bot_id,
        "user_id": user_id,
        "conversation_id": conversation_id or "",
    }
    files: Optional[Dict[str, Tuple[str, bytes, str]]] = None
    if file_path:
        with open(file_path, "rb") as f:
            data = f.read()
        # field name is `file` per backend API
        files = {
            "file": (file_path.split("/")[-1] or "image.bin", data, "application/octet-stream"),
        }
    return iter_sse_events("/api/v1/coze/image/chat/stream", method="POST", form_fields=fields, files=files)