from typing import Any, Dict

from .http import http_post_multipart


def transcribe_audio(file_path: str) -> Dict[str, Any]:
    """
    调用后端 /api/v1/coze/audio/transcriptions 接口，将本地音频文件转写为文本。

    参数:
        file_path: 本地音频文件路径（支持 wav/mp3/m4a/ogg/opus 等常见格式，≤10MB）。

    返回:
        后端标准响应字典，形如 { success, code, message, data: { text, logid }, trace_id, mode }
    """
    # 读取文件字节
    with open(file_path, "rb") as f:
        data = f.read()

    # 基于扩展名的最佳 MIME 猜测（后端也会进一步检测）
    filename = (file_path.split("/")[-1] or "audio.wav")
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    mime = "application/octet-stream"
    if ext == "wav":
        mime = "audio/wav"
    elif ext == "mp3":
        mime = "audio/mpeg"
    elif ext == "m4a":
        mime = "audio/m4a"
    elif ext == "mp4":
        mime = "video/mp4"
    elif ext == "ogg":
        mime = "audio/ogg"
    elif ext == "opus":
        mime = "audio/opus"
    elif ext == "aac":
        mime = "audio/aac"
    elif ext == "amr":
        mime = "audio/amr"
    elif ext == "spx":
        mime = "audio/speex"

    files = {
        # 与前端保持一致的字段名: 'file'
        "file": (filename, data, mime),
    }
    return http_post_multipart("/api/v1/coze/audio/transcriptions", files=files)