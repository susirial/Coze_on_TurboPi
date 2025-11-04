import os
import yaml
from pathlib import Path
from typing import Optional

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.yaml"
_ENV_KEY = "TURBOPI_SERVER_IP"
_DEFAULT_IP = "127.0.0.1"
_PORT = 8000

_cached_ip: Optional[str] = None


def _load_ip_from_file() -> str:
    try:
        if _CONFIG_PATH.exists():
            with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                ip = str(data.get("server_ip") or _DEFAULT_IP).strip()
                return ip
    except Exception:
        pass
    return _DEFAULT_IP


def get_server_ip() -> str:
    global _cached_ip
    # Env overrides file
    ip = os.getenv(_ENV_KEY)
    if ip and ip.strip():
        return ip.strip()
    if _cached_ip:
        return _cached_ip
    _cached_ip = _load_ip_from_file()
    return _cached_ip


def get_base_url() -> str:
    ip = get_server_ip()
    return f"http://{ip}:{_PORT}"


def set_server_ip(ip: str) -> None:
    """Update `config.yaml` with a new server IP (runtime override).

    This is a helper for examples/tests; production可通过手动编辑文件或环境变量设置。
    """
    ip = str(ip).strip()
    if not ip:
        raise ValueError("server ip cannot be empty")
    _CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump({"server_ip": ip}, f, allow_unicode=True)
    global _cached_ip
    _cached_ip = ip