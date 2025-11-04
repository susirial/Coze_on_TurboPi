from typing import Optional, Dict, Any

from turbopi_sdk.coze_image import image_chat_stream

"""
交互示例（不带图片）：与指定 Coze Bot 进行循环问答，采用 SSE 流式输出。

使用说明：
- 在终端设置环境变量 `TURBOPI_COZE_BOT_ID`，或直接修改代码中的占位 `your_bot_id`。
- 运行脚本后在 `Q>` 提示符处输入问题，按回车提交；输入空行或 `exit`/`quit` 退出对话。

前置要求：
- 后端已正确配置 Coze：`llm_provider=coze`、`api_key`、`coze_workspace_id`。
- Bot 已发布到 Coze 后台的 "Agent As API" 渠道，否则对话可能返回 `4015` 未发布错误。

事件输出优化：
- 对 SSE 事件优先打印 `content` 字段，若无则打印完整事件对象，便于观察服务端返回结构。

会话上下文：
- 脚本会跟随服务端事件中的 `conversation_id`，在多轮对话中保持上下文一致。
"""


def chat_stream_interactive(bot_id: str) -> None:
    """与指定 Bot 进行交互式对话（不带图片）。

    - 维护 `conversation_id`，保证多轮上下文。
    - 用户通过输入问题进行连续提问，支持退出。
    """
    print("\n== coze/image/chat/stream (不带图片，用户交互) ==")
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
            for evt in image_chat_stream(text=q, bot_id=bot_id, conversation_id=conv_id):
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
    # bot_id = os.getenv("TURBOPI_COZE_BOT_ID") or "your_bot_id"

    bot_id = "7566499436240142355"
    print(f"== 使用 bot_id: {bot_id} ==")
    if bot_id == "your_bot_id":
        print("提示：请将 'your_bot_id' 替换为真实 Bot ID，或设置环境变量 TURBOPI_COZE_BOT_ID。")
    chat_stream_interactive(bot_id)


if __name__ == "__main__":
    main()