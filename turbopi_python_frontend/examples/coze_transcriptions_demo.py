from pathlib import Path
import argparse
import sys
import os

from turbopi_sdk.coze_transcriptions import transcribe_audio


# - 进入 SDK 目录： cd spec-kit-main/turbopi_python_sdk
# - 运行示例并指定文件： python examples/coze_transcriptions_demo.py --file /path/to/audio.wav
# - 也支持 MP3： python examples/coze_transcriptions_demo.py -f /path/to/audio.mp3

def main():
    print("== coze/audio/transcriptions ==")
    parser = argparse.ArgumentParser(description="上传本地录音文件到 Turbopi 后端进行语音转写")
    parser.add_argument("--file", "-f", required=True, help="本地录音文件路径（如 .wav/.mp3）")
    args = parser.parse_args()

    audio_path = args.file.strip()
    if not os.path.isfile(audio_path):
        print(f"文件不存在: {audio_path}", file=sys.stderr)
        sys.exit(1)
    if os.path.getsize(audio_path) <= 0:
        print(f"文件为空: {audio_path}", file=sys.stderr)
        sys.exit(1)

    print(f"上传并识别中... 文件: {audio_path}")
    try:
        result = transcribe_audio(audio_path)
    except Exception as e:
        print(f"上传识别失败: {e}", file=sys.stderr)
        sys.exit(1)

    # 解析并打印识别结果
    if isinstance(result, dict) and result.get("success"):
        data = result.get("data") or {}
        text = data.get("text")
        logid = data.get("logid")
        trace_id = result.get("trace_id")
        print("识别成功")
        print(f"- 文本: {text}")
        if logid:
            print(f"- logid: {logid}")
        if trace_id:
            print(f"- trace_id: {trace_id}")
    else:
        print("识别失败:")
        print(result)
        sys.exit(2)


if __name__ == "__main__":
    main()