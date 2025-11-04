# Turbopi Python SDK（免安装，本地直接引入）

本 SDK 封装了 Turbopi 后端的 HTTP 接口（状态、控制、摄像头、蜂鸣器、配置，以及 Coze 系列接口：音频、会话、文件、图片、Bot、工作区）。

- 仅需在 `config.yaml` 中配置一个服务端 IP（默认 `127.0.0.1`），SDK 会使用 `http://<IP>:8000` 作为后端地址。
- SDK 不需要安装，直接将本目录加入你的 Python 工程或以相对导入方式使用即可。
- 每个接口均提供对应的示例脚本，便于学习者即刻调用与测试。

## 目录结构

```
turbopi_python_sdk/
├── README.md                # 本使用文档
├── config.yaml              # 仅需设置服务端 IP
├── turbopi_sdk/             # SDK 源码（函数封装）
│   ├── __init__.py
│   ├── sdk_config.py        # 加载 IP，生成 base_url
│   ├── http.py              # 通用 HTTP 客户端与 SSE 工具
│   ├── status.py            # 系统状态接口封装
│   ├── control.py           # 运动控制接口封装
│   ├── camera.py            # 摄像头快照接口封装
│   ├── buzzer.py            # 蜂鸣器接口封装
│   ├── config_api.py        # 后端配置管理接口封装
│   ├── coze_audio.py        # Coze 音频相关接口
│   ├── coze_conversations.py# Coze 会话与流式聊天接口
│   ├── coze_files.py        # Coze 文件上传接口
│   ├── coze_image.py        # Coze 图片对话接口（SSE）
│   ├── coze_bots.py         # Coze Bot 管理接口
│   └── coze_workspace.py    # Coze 工作区接口
└── examples/                # 每个接口的调用示例（可当作测试）
    ├── status_demo.py
    ├── control_demo.py
    ├── camera_demo.py
    ├── buzzer_demo.py
    ├── config_demo.py
    ├── coze_audio_demo.py
    ├── coze_conversations_demo.py
    ├── coze_files_demo.py
    ├── coze_image_demo.py
    ├── coze_bots_demo.py
    └── coze_workspace_demo.py
```

## 快速开始

1) 设置服务端 IP：编辑 `turbopi_python_sdk/config.yaml`

```yaml
server_ip: 127.0.0.1
```

2) 在你的 Python 文件中导入并调用。例如：

```python
from turbopi_sdk.status import get_status, get_health, get_mode
from turbopi_sdk.control import move, stop, estop, get_state
from turbopi_sdk.camera import snapshot
from turbopi_sdk.buzzer import set_buzzer

# 系统状态
print(get_status())

# 控制移动（向前，速度0.5，持续1000ms）
print(move(command="forward", speed=0.5, duration_ms=1000))

# 正常停止
print(stop())

# 紧急停止
print(estop())

# 获取当前控制状态
print(get_state())

# 摄像头快照（可指定宽高与JPEG质量）
print(snapshot(width=640, height=480, quality=80))

# 蜂鸣器（可使用默认参数）
print(set_buzzer(freq=2000, on_time=0.2, off_time=0.05, repeat=1))
```

3) 直接运行示例（把当前目录加入 `PYTHONPATH` 或用相对导入）：

```bash
cd turbopi_python_sdk
python3 examples/status_demo.py
python3 examples/control_demo.py
python3 examples/camera_demo.py
python3 examples/buzzer_demo.py
python3 examples/config_demo.py
python3 examples/coze_audio_demo.py
python3 examples/coze_conversations_demo.py
python3 examples/coze_files_demo.py
python3 examples/coze_image_demo.py
python3 examples/coze_bots_demo.py
python3 examples/coze_workspace_demo.py
```

## 配置与环境

- 仅需设置 `server_ip`，SDK 自动使用 `http://<IP>:8000`。
- 可用环境变量临时覆盖：`TURBOPI_SERVER_IP`（优先级高于 `config.yaml`）。
- SDK 默认使用 `requests` 库进行 HTTP 调用和流式（SSE）读取，请确保环境已安装：

```bash
pip install requests
```

## 响应格式与错误处理

- 后端统一返回结构：`{"success": true, "code": "SUCCESS", "message": "...", "data": {...}, "trace_id": "...", "mode": "..."}`。
- 当后端抛出错误时，HTTP 状态码可能为 4xx/5xx，响应体一般为 `detail` 字段包含 `code/message/trace_id` 等信息。SDK 会在异常时抛出 `HTTPError` 或返回包含 `error` 信息的字典，示例中均做了打印输出便于排查。

## 流式（SSE）接口

- Coze 会话、音频与图片相关接口支持 SSE（`text/event-stream`），SDK 提供了迭代器形式的工具，可逐条读取 `data: {...}` 事件，事件中常见 `type`：`conversation_id`、`content`、`completed`、`done`、`error`。
- 示例：查看 `examples/coze_conversations_demo.py`、`examples/coze_audio_demo.py`、`examples/coze_image_demo.py`。

## 每个服务的示例与测试

- `examples/` 目录中每个脚本即为对应服务的最小可运行示例，运行即视为一次“测试”。你也可以将这些示例脚本整合到自己的测试框架（如 pytest）。

## 常见问题

- 若服务端未启动或 IP 配置错误，会出现连接失败（`ConnectionError`）。请确认后端服务已在目标 IP 的 `8000` 端口运行。
- 需要设置 Coze 相关的 token/workspace/bot 等信息时，请按后端的配置管理接口或环境变量要求进行配置（参考后端 README）。