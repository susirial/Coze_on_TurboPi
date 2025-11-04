from turbopi_sdk.coze_files import upload_file
from pathlib import Path

def main():
    print("== coze/files/upload ==")
    # 请把路径替换为一张存在的本地文件
    avatar_file_path = str(Path(__file__).resolve().parent.parent / "deepseeek-logo.png")
    
    # /path/to/your/local/file.txt
    print(upload_file(avatar_file_path))


if __name__ == "__main__":
    main()