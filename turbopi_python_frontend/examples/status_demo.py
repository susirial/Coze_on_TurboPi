from turbopi_sdk.status import get_status, get_health, get_mode


def main():
    print("== /status ==")
    print(get_status())

    print("\n== /status/health ==")
    print(get_health())

    print("\n== /status/mode ==")
    print(get_mode())


if __name__ == "__main__":
    main()