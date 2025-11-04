from typing import Any, Dict

from .http import http_get


def get_status() -> Dict[str, Any]:
    return http_get("/status/")


def get_health() -> Dict[str, Any]:
    return http_get("/status/health")


def get_mode() -> Dict[str, Any]:
    return http_get("/status/mode")