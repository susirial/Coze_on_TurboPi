from turbopi_sdk.buzzer import set_buzzer


def main():
    print("== buzzer/set default ==")
    print(set_buzzer())

    print("\n== buzzer/set custom (freq=2000, on=0.2, off=0.05, repeat=1) ==")
    print(set_buzzer(freq=2000, on_time=0.2, off_time=0.05, repeat=2))


if __name__ == "__main__":
    main()