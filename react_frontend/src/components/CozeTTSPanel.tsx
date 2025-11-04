import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { TTSRequest, TTSResult } from '../lib/api'

export default function CozeTTSPanel() {
  const [voiceId, setVoiceId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('这是一条 TTS 测试文本。')
  const [filenamePrefix, setFilenamePrefix] = useState('coze_tts')
  const [play, setPlay] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TTSResult | null>(null)

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

  const canSubmit = !!inputText && !loading

  async function handleSubmit() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const payload: TTSRequest = { input_text: inputText }
      if (filenamePrefix) payload.filename_prefix = filenamePrefix
      payload.play = play

      const res = await api.tts(payload)
      setResult(res.data as TTSResult)
    } catch (e: any) {
      setError(e?.message || '调用 TTS 接口失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>文本转语音测试（TTS）</h2>
      <p style={{ marginTop: 4, color: '#666' }}>
        该界面调用后端 <code>/api/v1/coze/audio/tts</code>，使用当前保存的 <code>voice_id</code> 合成 WAV，并可选择在后端播放。
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
          <span>输入文本（必填）</span>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="请输入要合成的文本"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>文件名前缀（可选，固定文件名，不含时间戳）</span>
          <input
            value={filenamePrefix}
            onChange={(e) => setFilenamePrefix(e.target.value)}
            placeholder="coze_tts"
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
            {loading ? '正在调用...' : '开始 TTS'}
          </button>
          {!voiceId && (
            <small style={{ color: '#b00' }}>当前没有 voice_id，后端会报错。</small>
          )}
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
              <strong>TTS 音频路径：</strong>
              <code style={{ marginLeft: 6 }}>{result.tts_audio_path}</code>
              <button
                style={{ marginLeft: 8 }}
                onClick={() => navigator.clipboard.writeText(result.tts_audio_path)}
              >
                复制
              </button>
            </div>
            <div>
              <strong>使用的 voice_id：</strong>
              <code style={{ marginLeft: 6 }}>{result.voice_id}</code>
            </div>
            <small style={{ color: '#666' }}>
              注意：该音频文件保存在后端服务器的 <code>~/Downloads</code> 目录中，前端无法直接播放。
            </small>
          </div>
        </div>
      )}
    </div>
  )
}