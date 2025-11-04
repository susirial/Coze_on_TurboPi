from turbopi_sdk.coze_audio import list_voices, voice_id_get, voice_id_set, chat, chat_stream, tts


def main():
    print("== coze/audio/voices ==")
    print(list_voices())

    print("\n== coze/audio/voice_id (get) ==")
    print(voice_id_get())

    print("\n== coze/audio/voice_id (set) ==")
    # 将 'your_voice_id' 替换为有效的 voice_id
    # 7426720361733013513 扣子 魅力女友
    print(voice_id_set("7426720361733013513"))

    # # 7566842318587412515 BOT ID 用你的替换
    # print("\n== coze/audio/chat ==")
    # print(chat(input_text="你好，测试音频聊天", bot_id="7566842318587412515", filename_prefix="sdk_demo", play=True))

    # # print("\n== coze/audio/chat/stream ==")
    # # for evt in chat_stream(input_text="流式音频聊天测试", bot_id="7566842318587412515", play=True):
    # #     print(evt)

    # time.sleep(3)
    # print("\n== coze/audio/tts ==")
    # print(tts(input_text="合成语音测试", filename_prefix="sdk_tts", play=True))


if __name__ == "__main__":
    main()