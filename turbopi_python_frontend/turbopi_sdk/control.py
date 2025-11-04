from typing import Any, Dict, Optional

from .http import http_get, http_post_json


def move(command: str, duration_ms: Optional[int] = None, speed: Optional[float] = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {"command": command}
    if duration_ms is not None:
        body["duration_ms"] = int(duration_ms)
    if speed is not None:
        body["speed"] = float(speed)
    return http_post_json("/control/move", body)


def stop() -> Dict[str, Any]:
    return http_post_json("/control/stop", {})


def estop() -> Dict[str, Any]:
    return http_post_json("/control/estop", {})


def get_state() -> Dict[str, Any]:
    return http_get("/control/state")