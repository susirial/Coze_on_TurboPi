# Coze_on_TurboPi

Coze CN 在 TurboPi 小车上的一体化解决方案。该项目为前端开源（Vite React 与 Python SDK/示例），后端闭源（FastAPI + ROS2，核心逻辑已编译为 `.so` 库）。支持车控（方向与急停）、摄像头快照、蜂鸣器控制，以及 Coze 对话、TTS/ASR、文件上传、多模态图片会话等能力。

---

## 项目概况

- 目标：在树莓派 TurboPi 车上运行 Coze 中文智能体，并通过统一的 HTTP/SSE 接口与前端应用（Web/桌面）以及 Python SDK 交互。
- 前端：开源，包含基于 Vite + React 的演示 UI，以及 Python SDK 与完整示例。
- 后端：闭源，基于 FastAPI 封装 ROS2 能力；已编译为 `.so`，通过打包分发部署到 TurboPi（ROS2 Docker 环境中）。
- 通信：HTTP 和 Server-Sent Events（SSE）。多处接口支持流式事件输出，如会话聊天与音频聊天。

核心特性：
- 车控与设备：蜂鸣器控制、摄像头快照；（方向移动与急停接口按后端实现开放）
- Coze 能力：文本对话（流式）、音频语音（TTS/ASR/语音聊天流式）、文件上传与解析、多模态图片对话流式
- 运行模式：支持 `macbook_sim`（开发机模拟）与 `raspberry_pi_ros2`（树莓派 ROS2）两种运行模式切换

---

## 项目架构

```
┌───────────────────────────────┐        ┌───────────────────────────────┐
│   前端（开源）                 │        │   后端（闭源）                 │
│   - Vite + React 演示 UI      │  HTTP  │   - FastAPI + ROS2             │
│   - Python SDK + Examples     │ <─────▶│   - SSE/HTTP API（已编译为 .so）│
│                               │        │   - 与 ROS2 话题交互            │
└───────────────────────────────┘        └───────────────────────────────┘
            ▲                                        │
            │                                        ▼
            │                                TurboPi 传感器与执行器
            │                              （摄像头、驱动、蜂鸣器等）
```

目录结构（关键）：
- `react_frontend/`：开源 Vite + React 前端（演示与调试 UI）
  - `.env` 指定后端地址，例如：`VITE_API_BASE_URL=http://192.168.3.99:8000`
  - `src/lib/api.ts` 封装了统一请求与错误处理、SSE 事件流解析
- `turbopi_python_frontend/`：开源 Python SDK 与示例
  - `config.yaml` 指定后端 IP，例如：`server_ip: 192.168.3.80`
  - `examples/` 包含蜂鸣器、摄像头、文件上传、对话与音频等完整示例
- `protected_backend/`：闭源后端（分发为压缩包，核心代码已编译为 `.so` 库）
  - `openapi.yaml`：后端 FastAPI 接口说明（本仓库中提供接口文档）

---

## 快速开始

### 后端部署（树莓派 TurboPi / ROS2 Docker）

1. 通过 VNC 登录树莓派小车，打开普通终端（非 ROS2）
   - 在 `home/pi/` 中创建目录 `host_work`

2. 将 `protected_backend` 文件夹压缩，放到树莓派小车上
   - 示例：
     ```bash
     scp ./protected_backend.zip pi@192.168.3.99:/home/pi/host_work
     ```

3. 把 `protected_backend.zip` 拷贝到 ROS2 所在的 Docker 上
   - 示例：
     ```bash
     docker cp protected_backend.zip 79026e8d5ff2:/home/ubuntu/susirial_workstation
     ```

4. 解压缩
   ```bash
   unzip protected_backend.zip
   ```

5. 安装 Python 工具包，并进入 `protected_backend` 目录
   ```bash
   pip install python-multipart
   pip install fastapi
   pip install cozepy
   pip install pydantic-settings
   pip install 'uvicorn[standard]'
   ```

6. 在 `protected_backend` 目录运行服务
   ```bash
   # 设置运行模式（树莓派 ROS2）
   export TURBOPI_RUNTIME_MODE=raspberry_pi_ros2

   # 启动服务（默认监听 8000）
   python3 start_protected_backend.py
   ```

说明：后端代码已编译为 `.so` 库并以闭源方式分发；接口说明见 `protected_backend/openapi.yaml`。

### 前端（Vite React）启动

该前端可安装在笔记本或台式机：

```bash
cd react_frontend
npm install
npm run dev
```

- 配置后端地址：修改 `react_frontend/.env` 中的 `VITE_API_BASE_URL`，指向后端服务，例如 `http://<raspberry-pi-ip>:8000`
- 前端也支持在运行期通过页面或浏览器 `localStorage` 更新后端地址（`api.ts` 中 `setBaseUrl()` 会写入 `localStorage`）

### 前端（Python SDK 与示例）运行

示例与 SDK 位于 `turbopi_python_frontend/`，先确保配置了后端地址：

- 修改 `turbopi_python_frontend/config.yaml`：
  ```yaml
  server_ip: 192.168.3.80  # 请改为后端真实 IP
  ```

- 运行示例（以蜂鸣器为例）：
  ```bash
  cd turbopi_python_frontend
  PYTHONPATH=. python3 examples/buzzer_demo.py
  ```

`examples/` 下还包括：摄像头快照、车控、Coze 会话、音频 TTS/ASR、文件上传与图片会话等示例脚本，可直接参照运行。

---

## 配置说明

- 运行模式：后端通过环境变量 `TURBOPI_RUNTIME_MODE` 切换运行模式：
  - `macbook_sim`：在开发机上模拟运行（便于联调与无设备测试）
  - `raspberry_pi_ros2`：在树莓派 + ROS2 环境中运行（真实车控）
- ROS2 话题：后端在 ROS2 模式下订阅/发布相关话题，如摄像头（`ros2_camera_topic`）与蜂鸣器（`ros2_buzzer_topic`），并根据配置进行超时与质量控制。
- 前端地址：
  - React：`.env` 的 `VITE_API_BASE_URL`
  - Python：`config.yaml` 的 `server_ip`

---

## API 速览（详见 `protected_backend/openapi.yaml`）

主要接口与返回格式采用统一的 `SuccessResponse`/`ErrorResponse` 包装：

- `GET /status`：系统状态（运行模式、服务名、端口、启动时长等）
- `POST /api/v1/camera/snapshot`：摄像头快照（JPEG Base64 与保存路径、分辨率、质量、时间戳）
- `POST /api/v1/buzzer/set`：蜂鸣器控制（频率、开/关时长、重复次数）
- 会话（Coze）：
  - `POST /api/v1/coze/conversations`：创建会话
  - `POST /api/v1/coze/conversations/stream`：流式聊天（SSE），事件类型：`conversation_id`/`content`/`completed`/`error`
  - `POST /api/v1/coze/conversations/stream/plugins`：流式聊天（带本地插件演示）
  - `GET/DELETE /api/v1/coze/conversations/{conversation_id}`：获取/删除会话
- 音频（Coze Audio）：
  - `GET /api/v1/coze/audio/voices`：声音列表
  - `GET/PUT /api/v1/coze/audio/voice_id`：获取/设置当前 `voice_id`
  - `POST /api/v1/coze/audio/chat`：文本合成输入音频并进行语音聊天，保存 WAV 响应
  - `POST /api/v1/coze/audio/chat/stream`：语音聊天流（SSE），事件类型与会话相同，增加 `done`
  - `POST /api/v1/coze/audio/tts`：TTS 文本转语音（可选后端播放）
  - `POST /api/v1/coze/audio/transcriptions`：语音识别（ASR），multipart 上传音频文件
- 文件上传：
  - `POST /api/v1/coze/files/upload`：将本地文件上传至 Coze，返回 `file_id` 与元数据
- 图片对话：
  - `POST /api/v1/coze/image/chat/stream`：可选上传图片 + 文本，开启多模态流式对话（SSE）

注：控制移动与急停接口遵循后端设计（`ControlCommand`/`CarCommand`/`ControlMoveResponse`），具体路径以后端版本为准。

---

## 开发与调试建议

- Node.js ≥ 18，npm ≥ 9；Python ≥ 3.10（建议）
- 本地联调时可将后端置于 `macbook_sim` 模式，待硬件连通后再切换至 `raspberry_pi_ros2`
- 前端网络：确保前端主机与树莓派在同一网段；若使用反向代理，请确保 SSE 头与连接保持（避免缓冲/超时）
- CORS：后端允许的来源需与前端地址匹配；如遇跨域问题请检查后端配置与浏览器报错

---

## 常见问题（FAQ）

- 前端无法连接后端：
  - 检查 `react_frontend/.env` 的 `VITE_API_BASE_URL` 是否指向正确 IP 与端口
  - 浏览器控制台是否有 `NETWORK_ERROR` 或 `NETWORK_TIMEOUT`（前端默认 10s 超时）
- Python 示例报连接失败：
  - 确认 `turbopi_python_frontend/config.yaml` 的 `server_ip` 与后端一致
  - 运行时添加 `PYTHONPATH=.` 以确保示例正确引用 SDK
- SSE 流式不返回：
  - 检查网络代理与防火墙；确保后端进程仍在运行且未因设备资源不足退出
- 依赖安装失败：
  - 使用 `'uvicorn[standard]'` 以安装完整依赖；遇到 `pip` 权限问题可尝试虚拟环境或 `--user`

---

## 开源与贡献

- 本仓库的前端（`react_frontend/`）与 Python SDK/示例（`turbopi_python_frontend/`）为开源，欢迎提交 Issue 与 Pull Request。
- 后端（`protected_backend/`）为闭源分发，核心逻辑以编译库形式提供，暂不接受代码层面的改动建议。

---

## 许可证

本项目采用开源许可证（详见仓库根目录 `LICENSE`）。前端与示例代码可按许可证条款使用与修改；后端以闭源方式分发，仅供部署与集成使用。

---

## 联系方式

Turbopi Team（示例）：`team@turbopi.dev`

如需企业集成或定制支持，请通过邮箱与我们联系。

Coze CN on TurboPi Car
