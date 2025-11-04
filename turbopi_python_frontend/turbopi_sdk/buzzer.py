from typing import Any, Dict, Optional

from .http import http_post_json


def set_buzzer(freq: Optional[int] = None, on_time: Optional[float] = None, off_time: Optional[float] = None, repeat: Optional[int] = None) -> Dict[str, Any]:
    body: Dict[str, Any] = {}
    if freq is not None:
        body["freq"] = int(freq)
    if on_time is not None:
        body["on_time"] = float(on_time)
    if off_time is not None:
        body["off_time"] = float(off_time)
    if repeat is not None:
        body["repeat"] = int(repeat)
    return http_post_json("/api/v1/buzzer/set", body)