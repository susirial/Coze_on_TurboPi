from turbopi_sdk.camera import snapshot


def main():
    print("== camera/snapshot 640x480 q=80 ==")
    print(snapshot(width=640, height=480, quality=80))


if __name__ == "__main__":
    main()