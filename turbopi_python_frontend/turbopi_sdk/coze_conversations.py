from typing import Any, Dict, Iterable, List, Optional

from .http import http_get, http_post_json, iter_sse_events


def create(messages: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    body = {"messages": messages or []}
    return http_post_json("/api/v1/coze/conversations/", body)


def stream(text: str, bot_id: str, user_id: str = "fake user id", conversation_id: Optional[str] = None) -> Iterable[Dict[str, Any]]:
    body = {
        "text": text,
        "bot_id": bot_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
    }
    return iter_sse_events("/api/v1/coze/conversations/stream", method="POST", json_body=body)


def stream_plugins(text: str, bot_id: str, user_id: str = "fake user id", conversation_id: Optional[str] = None) -> Iterable[Dict[str, Any]]:
    body = {
        "text": text,
        "bot_id": bot_id,
        "user_id": user_id,
        "conversation_id": conversation_id,
    }
    return iter_sse_events("/api/v1/coze/conversations/stream/plugins", method="POST", json_body=body)


def retrieve(conversation_id: str) -> Dict[str, Any]:
    return http_get(f"/api/v1/coze/conversations/{conversation_id}")


def delete(conversation_id: str) -> Dict[str, Any]:
    # Backend uses DELETE method; our helper is POST-only for body, so call requests directly via http session would be custom.
    # For simplicity, emulate via POST to delete? No—must use correct HTTP verb.
    import requests
    from .sdk_config import get_base_url
    url = f"{get_base_url()}/api/v1/coze/conversations/{conversation_id}"
    resp = requests.delete(url, headers={"Accept": "application/json"})
    try:
        resp.raise_for_status()
        return resp.json()
    except Exception:
        try:
            return {"success": False, "error": resp.json(), "status": resp.status_code}
        except Exception:
            return {"success": False, "error": resp.text, "status": resp.status_code}