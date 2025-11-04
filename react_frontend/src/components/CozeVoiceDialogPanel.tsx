import React, { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

export default function CozeVoiceDialogPanel() {
  const [botId, setBotId] = useState<string>('')
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [recordedFile, setRecordedFile] = useState<File | null>(null)

  const [recognizedText, setRecognizedText] = useState<string>('')
  const [assistantText, setAssistantText] = useState<string>('')
  const [playOnBackend, setPlayOnBackend] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)

  // Recording internals (reuse pattern from CozeTranscriptionsPanel)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const startTsRef = useRef<number>(0)
  const tickTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => stopRecordingInternal()
  }, [])

  function startTickTimer() {
    stopTickTimer()
    tickTimerRef.current = window.setInterval(() => {
      if (!recording || !startTsRef.current) return
      const elapsedSec = (performance.now() - startTsRef.current) / 1000
      setDuration(elapsedSec)
      if (elapsedSec > 115) {
        setStatus('建议尽快停止录音（接近 10MB 限制）')
      }
    }, 200)
  }

  function stopTickTimer() {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current)
      tickTimerRef.current = null
    }
  }

  async function startRecording() {
    setError(null)
    setStatus('正在请求麦克风权限...')
    setRecognizedText('')
    setAssistantText('')
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      const audioCtx = new AC()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)

      chunksRef.current = []
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(input))
      }

      source.connect(processor)
      processor.connect(audioCtx.destination)

      audioCtxRef.current = audioCtx
      processorRef.current = processor
      sourceRef.current = source
      streamRef.current = stream
      startTsRef.current = performance.now()
      setDuration(0)
      startTickTimer()
      setRecording(true)
      setStatus('正在录音...')
    } catch (e: any) {
      setError(e?.message || '无法启动录音')
      setStatus('')
    }
  }

  function stopRecordingInternal() {
    try {
      processorRef.current?.disconnect()
      sourceRef.current?.disconnect()
      streamRef.current?.getTracks()?.forEach((t) => t.stop())
      audioCtxRef.current?.close()
    } catch {}
    audioCtxRef.current = null
    processorRef.current = null
    sourceRef.current = null
    streamRef.current = null
    stopTickTimer()
    setRecording(false)
  }

  async function stopRecording() {
    if (!recording) return
    setStatus('正在生成 WAV 文件...')
    const sampleRate = audioCtxRef.current?.sampleRate || 44100
    stopRecordingInternal()
    try {
      const samples = mergeBuffers(chunksRef.current)
      const wavBlob = encodeWAV(samples, sampleRate)
      const file = new File([wavBlob], 'recording.wav', { type: 'audio/wav' })
      setRecordedFile(file)
      const url = URL.createObjectURL(wavBlob)
      setAudioUrl(url)
      setStatus('录音完成，已生成 WAV')

      // 对讲机模式：录音完成后自动启动识别与对话（需先设置 BOT ID）
      if (botId && botId.trim()) {
        // 直接传入刚生成的 file，避免状态更新的异步滞后
        await runVoiceDialog(file)
      } else {
        setStatus('录音完成，请先输入 BOT ID 再开始识别')
      }
    } catch (e: any) {
      setError(e?.message || '生成 WAV 失败')
      setStatus('')
    }
  }

  function clearRecording() {
    setRecordedFile(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl('')
    setDuration(0)
    setStatus('')
    setError(null)
    chunksRef.current = []
    setRecognizedText('')
    setAssistantText('')
  }

  async function runVoiceDialog(fileArg?: File) {
    setError(null)
    setLoading(true)
    try {
      if (!botId.trim()) throw new Error('请先输入 BOT ID')
      const file = fileArg || recordedFile
      if (!file) throw new Error('请先录音')
      if (file.size > 10 * 1024 * 1024) throw new Error('音频文件超过 10MB 限制')

      // 1) 语音转写
      setStatus('正在识别语音...')
      const asr = await api.transcribeAudio(file)
      const text = asr.data?.text || ''
      setRecognizedText(text)
      if (!text.trim()) throw new Error('识别结果为空')

      // 2) AI 对话（流式）
      setStatus('正在与 AI 对话（流式）...')
      let assistant = ''
      for await (const event of api.streamChatUnified({ text, bot_id: botId }, { usePlugins: false })) {
        if (event.type === 'content' && event.content) {
          assistant += event.content
          setAssistantText(assistant)
        } else if (event.type === 'completed' && event.content) {
          assistant = event.content
          setAssistantText(assistant)
          break
        } else if (event.type === 'error') {
          throw new Error(event.content || 'AI 对话出错')
        }
      }

      // 3) TTS 播报（在后端播放或仅生成文件）
      if (assistant && assistant.trim()) {
        setStatus(playOnBackend ? '正在后端合成并播放...' : '正在后端合成音频文件...')
        await api.tts({ input_text: assistant, play: playOnBackend, filename_prefix: 'voice_dialog' })
        setStatus(playOnBackend ? '已在后端播放生成的音频' : '已生成音频文件（未播放）')
      } else {
        setStatus('AI 未返回有效文本')
      }
    } catch (e: any) {
      setError(e?.message || '语音对话流程失败')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  // Helpers: PCM merge and WAV encoding
  function mergeBuffers(chunks: Float32Array[]): Float32Array {
    const length = chunks.reduce((sum, arr) => sum + arr.length, 0)
    const result = new Float32Array(length)
    let offset = 0
    for (const arr of chunks) {
      result.set(arr, offset)
      offset += arr.length
    }
    return result
  }

  function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }

  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // RIFF/WAVE header
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true) // PCM
    view.setUint16(20, 1, true) // format: PCM
    view.setUint16(22, 1, true) // mono channel
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate (mono 16-bit)
    view.setUint16(32, 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeString(view, 36, 'data')
    view.setUint32(40, samples.length * 2, true)

    floatTo16BitPCM(view, 44, samples)
    return new Blob([view], { type: 'audio/wav' })
  }

  const canRun = !!botId && !!recordedFile && !loading

  return (
    <div className="card">
      <h2>对讲机模式</h2>
      <p style={{ marginTop: 4, color: '#666' }}>
        流程：输入 <code>BOT ID</code> → 录音 → 调用 <code>/api/v1/coze/audio/transcriptions</code> → 调用会话流式接口 → 调用 <code>/api/v1/coze/audio/tts</code> 播放结果。
      </p>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>设置 BOT ID</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="请输入 BOT ID"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            style={{ padding: '4px 8px', minWidth: 280 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={playOnBackend} onChange={(e) => setPlayOnBackend(e.target.checked)} />
            <small>在后端直接播放 TTS 音频</small>
          </label>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>录音控制</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button disabled={recording} onClick={startRecording}>开始录音</button>
          <button disabled={!recording} onClick={stopRecording}>停止录音</button>
          <button onClick={clearRecording} disabled={recording || (!recordedFile && !audioUrl)}>清除</button>
          <small style={{ color: '#666' }}>建议录音 ≤ 2 分钟（10MB 限制）。</small>
        </div>
        <div style={{ marginTop: 8 }}>
          <small>录音时长：{duration.toFixed(1)} 秒</small>
        </div>
        {audioUrl && (
          <div style={{ marginTop: 8 }}>
            <audio src={audioUrl} controls />
            {recordedFile && (
              <div style={{ marginTop: 6 }}>
                <small>
                  生成文件：{recordedFile.name}（{recordedFile.size} 字节，类型 {recordedFile.type}）
                </small>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3>执行语音对话流程</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button disabled={!canRun} onClick={() => runVoiceDialog()}>识别 + 对话 + 播报</button>
          {loading && <small>正在处理...</small>}
        </div>
        {status && (
          <div style={{ marginTop: 8 }}>
            <small style={{ color: '#666' }}>{status}</small>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 8, color: 'crimson' }}>
            <small>错误：{error}</small>
          </div>
        )}
      </div>

      {(recognizedText || assistantText) && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>结果</h3>
          {recognizedText && (
            <div style={{ marginTop: 6 }}>
              <b>识别文本：</b>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{recognizedText}</div>
            </div>
          )}
          {assistantText && (
            <div style={{ marginTop: 10 }}>
              <b>AI 回复：</b>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{assistantText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}