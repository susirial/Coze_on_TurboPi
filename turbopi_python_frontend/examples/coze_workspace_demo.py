from turbopi_sdk.coze_workspace import get_workspace_id, set_workspace_id


def main():
    print("== coze/workspace/id ==")
    print(get_workspace_id())

    print("\n== coze/workspace/id (set) ==")
    # 将 'your_workspace_id' 替换为有效的 Coze 工作区 ID
    # 通过配置接口写入：PATCH /api/v1/config/ -> {"coze_workspace_id": "..."}
    # 你的工作空间配置
    print(set_workspace_id("7566480879158476843"))

    print("\n== coze/workspace/id (verify) ==")
    print(get_workspace_id())


if __name__ == "__main__":
    main()