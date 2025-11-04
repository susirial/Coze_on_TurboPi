from turbopi_sdk.config_api import (
    get_config,
    put_config,
    patch_config,
    get_schema,
    reset_config,
    get_config_with_secrets,
)


def main():
    print("== get config (masked) ==")
    print(get_config())

    print("\n== get config (include secrets) ==")
    print(get_config(include_secrets=True))

    print("\n== get schema ==")
    print(get_schema())

    print("\n== patch config (notes) ==")
    print(patch_config({"notes": "set by SDK demo"}))

    print("\n== put config (telemetry_enabled=false) ==")
    cfg = get_config().get("data", {}).get("config", {})
    if isinstance(cfg, dict):
        cfg["telemetry_enabled"] = False
        print(put_config(cfg))
    else:
        print("skip PUT: cannot read current config")

    print("\n== reset config ==")
    print(reset_config())

    print("\n== get config secrets ==")
    print(get_config_with_secrets())


if __name__ == "__main__":
    main()