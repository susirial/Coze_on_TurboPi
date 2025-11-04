import json
import uuid
from typing import Any, Dict, Generator, Iterable, Optional, Tuple

import requests

from .sdk_config import get_base_url


DEFAULT_TIMEOUT = 15  # seconds


def _headers(trace_id: Optional[str] = None, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
    h = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Trace-ID": trace_id or str(uuid.uuid4()),
    }
    if extra:
        h.update(extra)
    return h


def _handle_response(resp: requests.Response) -> Dict[str, Any]:
    try:
        resp.raise_for_status()
        return resp.json()
    except requests.HTTPError:
        # Try to parse backend error format
        try:
            data = resp.json()
            # FastAPI HTTPException uses {"detail": {...}}
            if isinstance(data, dict) and "detail" in data:
                return {"success": False, "error": data["detail"], "status": resp.status_code}
            return {"success": False, "error": data, "status": resp.status_code}
        except Exception:
            return {"success": False, "error": resp.text, "status": resp.status_code}


def http_get(path: str, params: Optional[Dict[str, Any]] = None, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    url = f"{get_base_url()}{path}"
    resp = requests.get(url, params=params or {}, headers=_headers(), timeout=timeout)
    return _handle_response(resp)


def http_post_json(path: str, body: Optional[Dict[str, Any]] = None, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    url = f"{get_base_url()}{path}"
    data = json.dumps(body or {})
    resp = requests.post(url, data=data, headers=_headers(), timeout=timeout)
    return _handle_response(resp)


def http_put_json(path: str, body: Optional[Dict[str, Any]] = None, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    url = f"{get_base_url()}{path}"
    data = json.dumps(body or {})
    resp = requests.put(url, data=data, headers=_headers(), timeout=timeout)
    return _handle_response(resp)


def http_patch_json(path: str, body: Optional[Dict[str, Any]] = None, timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    url = f"{get_base_url()}{path}"
    data = json.dumps(body or {})
    resp = requests.patch(url, data=data, headers=_headers(), timeout=timeout)
    return _handle_response(resp)


def http_post_multipart(
    path: str,
    fields: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Tuple[str, bytes, str]]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Dict[str, Any]:
    """
    files: { field_name: (filename, file_bytes, mime) }
    fields: regular form fields
    """
    url = f"{get_base_url()}{path}"
    hdr = _headers(extra={"Accept": "application/json"})
    # remove json content-type for multipart
    hdr.pop("Content-Type", None)
    resp = requests.post(url, data=fields or {}, files=files or {}, headers=hdr, timeout=timeout)
    return _handle_response(resp)


def iter_sse_events(
    path: str,
    method: str = "POST",
    json_body: Optional[Dict[str, Any]] = None,
    form_fields: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Tuple[str, bytes, str]]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> Iterable[Dict[str, Any]]:
    """
    Open an SSE stream and yield parsed event objects.
    - For JSON: set method="POST" and provide json_body
    - For multipart form: provide form_fields/files
    """
    url = f"{get_base_url()}{path}"
    headers = _headers(extra={"Accept": "text/event-stream"})
    if method.upper() == "GET":
        r = requests.get(url, headers=headers, stream=True, timeout=timeout)
    else:
        if files:
            # multipart/form-data with files
            headers.pop("Content-Type", None)
            r = requests.post(url, data=form_fields or {}, files=files, headers=headers, stream=True, timeout=timeout)
        elif json_body is not None:
            # application/json body
            headers["Content-Type"] = "application/json"
            r = requests.post(url, data=json.dumps(json_body), headers=headers, stream=True, timeout=timeout)
        elif form_fields is not None:
            # x-www-form-urlencoded body (no files)
            headers.pop("Content-Type", None)
            r = requests.post(url, data=form_fields, headers=headers, stream=True, timeout=timeout)
        else:
            # no body
            r = requests.post(url, headers=headers, stream=True, timeout=timeout)

    r.raise_for_status()

    buffer = ""
    for chunk in r.iter_content(chunk_size=1024):
        if not chunk:
            continue
        buffer += chunk.decode("utf-8", errors="ignore")
        while "\n\n" in buffer:
            frame, buffer = buffer.split("\n\n", 1)
            # Parse lines in frame
            data_lines = []
            for line in frame.splitlines():
                if line.startswith("data:"):
                    data_lines.append(line[len("data:"):].strip())
            if not data_lines:
                continue
            try:
                payload_str = "\n".join(data_lines)
                event = json.loads(payload_str)
                yield event
            except Exception:
                yield {"type": "raw", "content": "\n".join(data_lines)}