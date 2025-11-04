from typing import Any, Dict, Optional
from pathlib import Path

from turbopi_sdk.coze_bots import create_bot_multipart
from turbopi_sdk.coze_workspace import get_workspace_id
from turbopi_sdk.coze_conversations import stream

"""
单独测试：multipart 创建 Bot（带头像）并进行循环问答，流式输出。

注意：
- 需要有效的 Coze 配置（llm_provider=coze、api_key、workspace_id）。
- 头像默认使用仓库内图片 deepseeek-logo.png，避免文件不存在错误。
"""


def _safe_get_workspace_id() -> Optional[str]:
    resp = get_workspace_id()
    data = resp.get("data") if isinstance(resp, dict) else None
    if isinstance(data, dict):
        return data.get("workspace_id")
    return None


def _extract_bot_id(resp: Dict[str, Any]) -> Optional[str]:
    if not isinstance(resp, dict):
        return None
    data = resp.get("data")
    if isinstance(data, dict):
        if isinstance(data.get("bot"), dict):
            bot = data["bot"]
            return bot.get("bot_id") or bot.get("id")
        return data.get("bot_id") or data.get("id")
    return resp.get("bot_id") or resp.get("id")


# 跟用户循环对话
def chat_stream_interactive(bot_id: str) -> None:
    print("\n== coze/conversations stream (Multipart bot, 用户交互) ==")
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


def main() -> None:
    print("== coze/bots/create (Multipart 单独测试，含头像) ==")
    ws_id = _safe_get_workspace_id()
    print({"workspace_id": ws_id})

    avatar_file_path = str(Path(__file__).resolve().parent.parent / "deepseeek-logo.png")
    resp = create_bot_multipart(
        name="sdk-bot-mp",
        bot_prompt="You are a helpful assistant",
        prologue="Welcome",
        suggested_questions=["你好", "自我介绍", "示例"],
        description="created by SDK demo (multipart)",
        workspace_id=ws_id,
        avatar_file_path=avatar_file_path,
    )
    print(resp)

    bot_id = _extract_bot_id(resp)
    if bot_id:
        chat_stream_interactive(bot_id)
    else:
        print("未能提取到 bot_id，跳过对话示例。")


if __name__ == "__main__":
    main()