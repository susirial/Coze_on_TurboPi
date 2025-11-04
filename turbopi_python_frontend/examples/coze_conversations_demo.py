from typing import Optional, Any, Dict

from turbopi_sdk.coze_conversations import stream
from turbopi_sdk.coze_bots import retrieve_bot


def chat_stream_interactive(bot_id: str) -> None:
    print("\n== coze/conversations stream (用户交互) ==")
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
            for evt in stream(text=q, bot_id=bot_id, conversation_id=conv_id):
                if isinstance(evt, dict):
                    content = evt.get("content")
                    if content:
                        print(f"→ {content}")
                    else:
                        print(evt)
                    cid = evt.get("conversation_id")
                    if not cid and isinstance(evt.get("data"), dict):
                        cid = evt["data"].get("conversation_id")
                    if cid:
                        conv_id = cid
                else:
                    print(evt)
        except Exception as e:
            print({"success": False, "error": str(e)})


def main():
    import os
    #bot_id = os.getenv("TURBOPI_COZE_BOT_ID") or "your_bot_id"
    bot_id = "7566499436240142355"
    print(f"== 使用 bot_id: {bot_id} ==")

    print("\n== coze/bots/retrieve ==")
    try:
        resp: Dict[str, Any] = retrieve_bot(bot_id)
        print(resp)
    except Exception as e:
        print({"success": False, "error": str(e)})

    print("\n== 开始交互式对话 ==")
    if bot_id == "your_bot_id":
        print("提示：请将代码中的 'your_bot_id' 替换为实际 Bot ID，或设置环境变量 TURBOPI_COZE_BOT_ID。")
    chat_stream_interactive(bot_id)


if __name__ == "__main__":
    main()