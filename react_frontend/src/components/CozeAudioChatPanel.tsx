import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { ChatAudioRequest, ChatAudioResponse } from '../lib/api'

export default function CozeAudioChatPanel() {
  const [botId, setBotId] = useState('')
  const [inputText, setInputText] = useState('你好，请简单介绍一下你自己。')
  const [userId, setUserId] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [filenamePrefix, setFilenamePrefix] = useState('coze_chat_test')
  const [play, setPlay] = useState(false)

  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ChatAudioResponse | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamConversationId, setStreamConversationId] = useState<string>('')
  const [streamChunks, setStreamChunks] = useState<string[]>([])
  const [streamCompletedText, setStreamCompletedText] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getVoiceId()
        setVoiceId(res.data?.voice_id ?? null)
      } catch (e: any) {
        setError(e?.message || '获取当前 voice_id 失败')
      }
    })()
  }, [])

  const canSubmit = !!botId && !!inputText && !loading

  async function handleSubmit() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const payload: ChatAudioRequest = {
        input_text: inputText,
        bot_id: botId,
      }
      if (userId) payload.user_id = userId
      if (conversationId) payload.conversation_id = conversationId
      if (filenamePrefix) payload.filename_prefix = filenamePrefix
      payload.play = play

      const res = await api.chatWithAudio(payload)
      setResult(res.data as ChatAudioResponse)
    } catch (e: any) {
      setError(e?.message || '调用 chat with audio 失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleStream() {
    setStreamError(null)
    setStreaming(true)
    setStreamConversationId('')
    setStreamChunks([])
    setStreamCompletedText('')

    try {
      const payload: ChatAudioRequest = {
        input_text: inputText,
        bot_id: botId,
      }
      if (userId) payload.user_id = userId
      if (conversationId) payload.conversation_id = conversationId
      if (filenamePrefix) payload.filename_prefix = filenamePrefix
      payload.play = play

      for await (const evt of api.chatWithAudioStream(payload)) {
        if (evt.type === 'conversation_id' && evt.content) {
          setStreamConversationId(evt.content)
        } else if (evt.type === 'content' && evt.content) {
          setStreamChunks((prev) => [...prev, evt.content!])
        } else if (evt.type === 'completed' && evt.content) {
          setStreamCompletedText(evt.content)
        } else if (evt.type === 'error') {
          setStreamError(evt.content || '流式返回错误')
        } else if (evt.type === 'done') {
          // end of stream
        }
      }
    } catch (e: any) {
      setStreamError(e?.message || '启动流式返回失败')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="card">
      <h2>音频聊天测试（Chat with Audio）</h2>
      <p style={{ marginTop: 4, color: '#666' }}>
        该界面会调用后端 <code>/api/v1/coze/audio/chat</code> 接口，使用当前保存的 <code>voice_id</code> 合成输入文本，并返回音频文件路径。
      </p>

      {voiceId ? (
        <div className="alert success" style={{ marginTop: 8 }}>
          当前 voice_id：<code>{voiceId}</code>
        </div>
      ) : (
        <div className="alert error" style={{ marginTop: 8 }}>
          未检测到当前 voice_id。请先在“Coze 音色”页设置后再测试。
        </div>
      )}

      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Bot ID（必填）</span>
          <input
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            placeholder="例如：7398402386055219201"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>输入文本（必填）</span>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="请输入你想让机器人说的话"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>用户 ID（可选）</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="自定义用户标识"
              style={{ padding: '6px 8px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>会话 ID（可选）</span>
            <input
              value={conversationId}
              onChange={(e) => setConversationId(e.target.value)}
              placeholder="复用已有会话"
              style={{ padding: '6px 8px' }}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>文件名前缀（可选）</span>
          <input
            value={filenamePrefix}
            onChange={(e) => setFilenamePrefix(e.target.value)}
            placeholder="coze_chat_test"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={play}
            onChange={(e) => setPlay(e.target.checked)}
          />
          <span>后端播放音频（play）</span>
        </label>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={!canSubmit || !voiceId} onClick={handleSubmit}>
            {loading ? '正在调用...' : '开始测试'}
          </button>
          {!voiceId && (
            <small style={{ color: '#b00' }}>当前没有 voice_id，后端会报错。</small>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={!canSubmit || !voiceId || streaming} onClick={handleStream}>
            {streaming ? '流式进行中...' : '开始流式测试'}
          </button>
          <small style={{ color: '#666' }}>流式仅返回文本，音频文件写入后端。</small>
        </div>
      </div>

      {error && (
        <div className="alert error" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>调用成功</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <strong>输入音频路径：</strong>
              <code style={{ marginLeft: 6 }}>{result.input_audio_path}</code>
              <button
                style={{ marginLeft: 8 }}
                onClick={() => navigator.clipboard.writeText(result.input_audio_path)}
              >
                复制
              </button>
            </div>
            <div>
              <strong>响应音频路径：</strong>
              <code style={{ marginLeft: 6 }}>{result.response_audio_path}</code>
              <button
                style={{ marginLeft: 8 }}
                onClick={() => navigator.clipboard.writeText(result.response_audio_path)}
              >
                复制
              </button>
            </div>
            <div>
              <strong>会话 ID：</strong>
              <code style={{ marginLeft: 6 }}>{result.conversation_id}</code>
              <button
                style={{ marginLeft: 8 }}
                onClick={() => navigator.clipboard.writeText(result.conversation_id)}
              >
                复制
              </button>
            </div>
            <div>
              <strong>使用的 voice_id：</strong>
              <code style={{ marginLeft: 6 }}>{result.voice_id}</code>
            </div>
            <small style={{ color: '#666' }}>
              注意：这些是后端服务器上的绝对路径，前端无法直接播放，但可以用于对接下载或调试。
            </small>
          </div>
        </div>
      )}

      {(streamError || streamChunks.length > 0 || streamCompletedText) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>流式返回（文本）</h3>
          {streamConversationId && (
            <div style={{ marginBottom: 8 }}>
              <strong>会话 ID：</strong>
              <code style={{ marginLeft: 6 }}>{streamConversationId}</code>
            </div>
          )}
          {streamChunks.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <strong>内容片段：</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>
                {streamChunks.join('')}
              </div>
            </div>
          )}
          {streamCompletedText && (
            <div style={{ marginBottom: 8 }}>
              <strong>完整消息：</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{streamCompletedText}</div>
            </div>
          )}
          {streamError && (
            <div className="alert error" style={{ marginTop: 8 }}>{streamError}</div>
          )}
        </div>
      )}
    </div>
  )
}