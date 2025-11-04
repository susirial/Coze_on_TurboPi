from typing import Optional, Dict, Any
from pathlib import Path

from turbopi_sdk.coze_image import image_chat_stream

"""
交互示例（带图片）：与指定 Coze Bot 进行循环问答，上传固定图片并采用 SSE 流式输出。

使用说明：
- 在终端设置环境变量 `TURBOPI_COZE_BOT_ID`，或直接修改代码中的占位 `your_bot_id`。
- 运行脚本后在 `Q>` 提示符处输入问题，按回车提交；输入空行或 `exit`/`quit` 退出对话。

图片文件：
- 默认使用仓库内图片 `deepseeek-logo.png`，避免文件不存在错误：
  `avatar_file_path = str(Path(__file__).resolve().parent.parent / "deepseeek-logo.png")`
- 如需自定义图片路径，请确保文件存在并替换 `avatar_file_path`。

前置要求：
- 后端已正确配置 Coze：`llm_provider=coze`、`api_key`、`coze_workspace_id`。
- Bot 已发布到 Coze 后台的 "Agent As API" 渠道，否则对话可能返回 `4015` 未发布错误。

事件输出优化与会话上下文：
- 对 SSE 事件优先打印 `content` 字段；若无则打印完整事件对象。
- 跟随服务端返回的 `conversation_id`，保证多轮上下文一致。
"""


def chat_stream_interactive(bot_id: str, file_path: str) -> None:
    """与指定 Bot 进行交互式对话（携带图片）。

    - 每次提问会附带同一张图片，模拟图文多轮问答。
    - 维护 `conversation_id`，保证多轮上下文。
    - 用户通过输入问题进行连续提问，支持退出。
    """
    print("\n== coze/image/chat/stream (带图片，用户交互) ==")
    print(f"图片文件: {file_path}")
    print("输入你的问题并回车，输入 'exit' 或空行退出。")
    conv_id: Optional[str] = None
    turn = 0
    while True:
        try:
            q = input("Q> ").strip()
        except EOFError:
            break
        if not q or q.lower() in {"exit", "quit"}:
            print("已退出对话。")
            break
        turn += 1
        print(f"\n[Turn {turn}] Q: {q}")
        try:
            for evt in image_chat_stream(text=q, bot_id=bot_id, file_path=file_path, conversation_id=conv_id):
                if isinstance(evt, dict):
                    content = evt.get("content")
                    if content:
                        print(f"→ {content}")
                    else:
                        print(evt)
                    # 捕获并沿用 conversation_id（若服务端事件带回）
                    cid = evt.get("conversation_id")
                    if not cid and isinstance(evt.get("data"), dict):
                        cid = evt["data"].get("conversation_id")
                    if cid:
                        conv_id = cid
                else:
                    print(evt)
        except Exception as e:
            print({"success": False, "error": str(e)})


def main() -> None:
    import os
    # 从环境变量读取 Bot ID；如未设置，请替换为你的真实 Bot ID
    bot_id = os.getenv("TURBOPI_COZE_BOT_ID") or "your_bot_id"
    # 需要BOT的模型可以识别图片
    bot_id = "7567268681173680178"
    print(f"== 使用 bot_id: {bot_id} ==")
    if bot_id == "your_bot_id":
        print("提示：请将 'your_bot_id' 替换为真实 Bot ID，或设置环境变量 TURBOPI_COZE_BOT_ID。")

    # 使用仓库内图片作为默认示例，避免路径不存在
    avatar_file_path = str(Path(__file__).resolve().parent.parent / "deepseeek-logo.png")
    print({"image_path": avatar_file_path})

    chat_stream_interactive(bot_id, file_path=avatar_file_path)


if __name__ == "__main__":
    main()