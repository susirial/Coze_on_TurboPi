from typing import Any, Dict, Optional

from .http import http_get, http_post_json, http_put_json, http_patch_json


def get_config(include_secrets: bool = False) -> Dict[str, Any]:
    params = {"include_secrets": str(bool(include_secrets)).lower()}
    return http_get("/api/v1/config/", params=params)


def put_config(config: Dict[str, Any]) -> Dict[str, Any]:
    return http_put_json("/api/v1/config/", config)


def patch_config(partial: Dict[str, Any]) -> Dict[str, Any]:
    return http_patch_json("/api/v1/config/", partial)


def get_schema() -> Dict[str, Any]:
    return http_get("/api/v1/config/schema")


def reset_config() -> Dict[str, Any]:
    return http_post_json("/api/v1/config/reset", {})


def get_config_with_secrets() -> Dict[str, Any]:
    return http_get("/api/v1/config/secrets")