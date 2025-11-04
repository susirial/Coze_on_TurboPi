from typing import Any, Dict, List, Optional, Tuple

from .http import http_get, http_post_json, http_post_multipart


def list_bots() -> Dict[str, Any]:
    return http_get("/api/v1/coze/bots/list")


def retrieve_bot(bot_id: str) -> Dict[str, Any]:
    return http_get(f"/api/v1/coze/bots/{bot_id}")


def create_bot_json(
    workspace_id: Optional[str],
    name: str,
    description: Optional[str],
    bot_prompt: str,
    prologue: str,
    suggested_questions: List[str],
    customized_prompt: Optional[str],
    model_id: str = "1737521813",
    temperature: float = 0.8,
    max_tokens: int = 4000,
    response_format: str = "markdown",
) -> Dict[str, Any]:
    body = {
        "workspace_id": workspace_id,
        "name": name,
        "description": description,
        "avatar_path": None,
        "bot_prompt": bot_prompt,
        "prologue": prologue,
        "suggested_questions": suggested_questions,
        "customized_prompt": customized_prompt,
        "model_id": model_id,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "response_format": response_format,
    }
    return http_post_json("/api/v1/coze/bots/create", body)


def create_bot_multipart(
    name: str,
    bot_prompt: str,
    prologue: str,
    suggested_questions: List[str],
    description: Optional[str] = None,
    workspace_id: Optional[str] = None,
    customized_prompt: Optional[str] = None,
    model_id: str = "1737521813",
    temperature: float = 0.8,
    max_tokens: int = 4000,
    response_format: str = "markdown",
    avatar_file_path: Optional[str] = None,
) -> Dict[str, Any]:
    fields = {
        "workspace_id": workspace_id or "",
        "name": name,
        "description": description or "",
        "bot_prompt": bot_prompt,
        "prologue": prologue,
        "suggested_questions": suggested_questions,
        "customized_prompt": customized_prompt or "",
        "model_id": model_id,
        "temperature": str(temperature),
        "max_tokens": str(max_tokens),
        "response_format": response_format,
    }
    files: Optional[Dict[str, Tuple[str, bytes, str]]] = None
    if avatar_file_path:
        with open(avatar_file_path, "rb") as f:
            data = f.read()
        files = {
            "avatar": (avatar_file_path.split("/")[-1] or "avatar.bin", data, "application/octet-stream"),
        }
    return http_post_multipart("/api/v1/coze/bots/create", fields=fields, files=files)