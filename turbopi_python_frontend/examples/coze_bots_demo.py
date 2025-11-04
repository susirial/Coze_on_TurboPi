from typing import Any, Dict, Optional, List

from turbopi_sdk.coze_bots import list_bots, retrieve_bot, create_bot_json, create_bot_multipart
from turbopi_sdk.coze_workspace import get_workspace_id
from turbopi_sdk.coze_conversations import stream

"""
示例说明：
- JSON 创建BOT示例：不上传头像，字段以 JSON 形式发送；适合快速创建或不需要头像的场景。
- Multipart 创建示例：使用 multipart/form-data，可同时上传头像文件（字段名 'avatar'）。

注意：
- 需要有效的 Coze workspace_id（通过 turbopi_sdk.coze_workspace.get_workspace_id 获取）。
- 如后端 Coze 未初始化（llm_provider/api_key/workspace 未配置），创建或对话可能返回 422/初始化错误。
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
        # 常见返回结构尝试提取 bot_id / id
        if isinstance(data.get("bot"), dict):
            bot = data["bot"]
            return bot.get("bot_id") or bot.get("id")
        return data.get("bot_id") or data.get("id")
    # 兜底：直接顶层键
    return resp.get("bot_id") or resp.get("id")


def _chat_with_bot(bot_id: str, text: str = "和我聊聊：你是谁？") -> None:
    print("\n== coze/conversations stream (chat) ==")
    try:
        for evt in stream(text=text, bot_id=bot_id):
            # 优化输出：优先显示事件中的内容
            if isinstance(evt, dict):
                content = evt.get("content")
                if content:
                    print(content)
                else:
                    print(evt)
            else:
                print(evt)
    except Exception as e:
        print({"success": False, "error": str(e)})


def demo_create_bot_json() -> None:
    print("\n== coze/bots/create (JSON 单独示例) ==")
    ws_id = _safe_get_workspace_id()
    print({"workspace_id": ws_id})
    resp = create_bot_json(
        workspace_id=ws_id,
        name="sdk-bot-json",
        description="created by SDK demo",
        bot_prompt="You are a helpful assistant",
        prologue="Welcome",
        suggested_questions=["你是谁?", "你能做什么?", "给我一个示例"],
        customized_prompt=None,
    )
    print(resp)
    bot_id = _extract_bot_id(resp)
    if bot_id:
        chat_stream_interactive(bot_id, title="coze/conversations stream (JSON bot, 用户交互)")
    else:
        print("未能提取到 bot_id，跳过对话示例。")


def chat_stream_interactive(bot_id: str, title: str = "") -> None:
    print(f"\n== {title or 'coze/conversations stream (用户交互)'} ==")
    print("输入你的问题并回车，输入 'exit' 或空行退出。")
    conv_id: Optional[str] = None
    while True:
        try:
            q = input("Q> ").strip()
        except EOFError:
            break
        if not q or q.lower() in {"exit", "quit"}:
            print("已退出对话。")
            break
        try:
            for evt in stream(text=q, bot_id=bot_id, conversation_id=conv_id):
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


def chat_stream_loop(bot_id: str, prompts: List[str], title: str = "") -> None:
    print(f"\n== {title or 'coze/conversations stream loop'} ==")
    conv_id: Optional[str] = None
    for idx, q in enumerate(prompts, start=1):
        print(f"\n[Turn {idx}] Q: {q}")
        try:
            for evt in stream(text=q, bot_id=bot_id, conversation_id=conv_id):
                if isinstance(evt, dict):
                    # 优先显示内容
                    content = evt.get("content")
                    if content:
                        print(f"→ {content}")
                    else:
                        print(evt)
                    # 尝试捕获并沿用 conversation_id（若服务端事件带回）
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
    print("== coze/bots/list ==")
    print(list_bots())

    print("\n== coze/bots/{bot_id} ==")
    print(retrieve_bot("your_bot_id"))

    # 单独创建示例：JSON
    # 并跟BOT交互
    demo_create_bot_json()


if __name__ == "__main__":
    main()