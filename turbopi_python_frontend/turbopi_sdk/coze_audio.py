from typing import Any, Dict, Iterable, Optional

from .http import http_get, http_post_json, iter_sse_events
from .config_api import patch_config


def list_voices() -> Dict[str, Any]:
    return http_get("/api/v1/coze/audio/voices")


def voice_id_get() -> Dict[str, Any]:
    return http_get("/api/v1/coze/audio/voice_id")


def voice_id_set(voice_id: str) -> Dict[str, Any]:
    # Backend expects voice ID to be stored in configuration.
    # Use config PATCH to set `coze_voice_id` instead of calling audio route.
    return patch_config({"coze_voice_id": voice_id})


def chat(input_text: str, bot_id: str, user_id: str = "user id", conversation_id: Optional[str] = None, filename_prefix: Optional[str] = None, play: bool = False) -> Dict[str, Any]:
    body = {
        "input_text": input_text,
        "bot_id": bot_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "filename_prefix": filename_prefix,
        "play": bool(play),
    }
    return http_post_json("/api/v1/coze/audio/chat", body)


def chat_stream(input_text: str, bot_id: str, user_id: str = "user id", conversation_id: Optional[str] = None, filename_prefix: Optional[str] = None, play: bool = False) -> Iterable[Dict[str, Any]]:
    body = {
        "input_text": input_text,
        "bot_id": bot_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
        "filename_prefix": filename_prefix,
        "play": bool(play),
    }
    return iter_sse_events("/api/v1/coze/audio/chat/stream", method="POST", json_body=body)


def tts(input_text: str, filename_prefix: Optional[str] = None, play: bool = True) -> Dict[str, Any]:
    body = {
        "input_text": input_text,
        "filename_prefix": filename_prefix,
        "play": bool(play),
    }
    return http_post_json("/api/v1/coze/audio/tts", body)