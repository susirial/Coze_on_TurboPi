from turbopi_sdk.control import move, stop, estop, get_state
import time

def main():
    print("== control/state (before) ==")
    print(get_state())

    print("\n== control/move forward 0.5 speed 1000ms ==")
    print(move(command="forward", speed=0.5, duration_ms=1000))

    print("\n== control/stop ==")
    print(stop())

    time.sleep(1)  # 暂停1秒
    
    print("\n== control/state (after) ==")
    print(get_state())

    print("\n== control/estop ==")
    print(estop())


if __name__ == "__main__":
    main()