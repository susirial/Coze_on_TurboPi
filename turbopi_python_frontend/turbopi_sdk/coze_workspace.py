from typing import Any, Dict

from .http import http_get
from .config_api import patch_config


def get_workspace_id() -> Dict[str, Any]:
    return http_get("/api/v1/coze/workspace/id")


def set_workspace_id(workspace_id: str) -> Dict[str, Any]:
    """通过配置接口写入 Coze Workspace ID。

    后端将 workspace_id 保存在配置中，因此通过 PATCH /api/v1/config/ 写入。
    """
    return patch_config({"coze_workspace_id": workspace_id})