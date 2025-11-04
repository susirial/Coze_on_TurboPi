#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Turbopi 后端服务
"""

import sys
from pathlib import Path
import importlib

current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))  # 使得 import app.* 指向 protected/app

print("🛡️  Turbopi 保护版启动")
print("📁 运行目录:", current_dir)

try:
    # 首选从 protected 目录导入 app.main
    app_main = importlib.import_module("app.main")
    app_main.main()
except Exception as e:
    # 回退：尝试从仓库原始 backend 路径导入
    try:
        repo_root = current_dir.parent.parent
        backend_dir = repo_root / "turbopi_backend" / "backend"
        sys.path.insert(0, str(backend_dir))
        app_main = importlib.import_module("app.main")
        app_main.main()
    except Exception as e2:
        print("❌ 启动失败:", e2)
        raise
