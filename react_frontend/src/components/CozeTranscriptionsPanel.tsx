import React, { useEffect, useRef, useState } from 'react'
import { api, type AudioTranscriptionsResult } from '../lib/api'

export default function CozeTranscriptionsPanel() {
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(0)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AudioTranscriptionsResult | null>(null)

  // Recording internals
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const startTsRef = useRef<number>(0)
  const tickTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      stopRecordingInternal()
    }
  }, [])

  function startTickTimer() {
    stopTickTimer()
    tickTimerRef.current = window.setInterval(() => {
      if (!recording || !startTsRef.current) return
      const elapsedSec = (performance.now() - startTsRef.current) / 1000
      setDuration(elapsedSec)
      // 10MB WAV mono at 44.1kHz ≈ 119秒，做一个近似提醒
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
    setResult(null)
    setStatus('正在请求麦克风权限...')
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
      const audioCtx = new AC()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const source = audioCtx.createMediaStreamSource(stream)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1)

      chunksRef.current = []
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        // Copy the buffer to avoid referencing recycled memory
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
    // Capture sampleRate before closing context
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
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setSelectedFile(f)
    setResult(null)
    setError(null)
  }

  async function handleTranscribe() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const file = recordedFile || selectedFile
      if (!file) {
        throw new Error('请先录音或选择音频文件')
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('音频文件超过 10MB 限制')
      }
      const res = await api.transcribeAudio(file)
      setResult(res.data || null)
      setStatus('识别成功')
    } catch (e: any) {
      setError(e?.message || '调用识别接口失败')
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

  const canTranscribe = !!(recordedFile || selectedFile) && !loading

  return (
    <div className="card">
      <h2>语音识别测试（Audio Transcriptions）</h2>
      <p style={{ marginTop: 4, color: '#666' }}>
        该界面会调用后端 <code>/api/v1/coze/audio/transcriptions</code> 接口，上传音频并返回识别文本。
      </p>

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
        <h3>或选择本地音频文件</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="audio/*" onChange={onFileChange} />
          {selectedFile && (
            <small>
              已选择：{selectedFile.name}（{selectedFile.size} 字节，{selectedFile.type || 'unknown'}）
            </small>
          )}
        </div>
        <small style={{ marginTop: 6, display: 'block', color: '#666' }}>
          支持常见类型：wav、mp3、m4a、mp4、ogg、opus、aac、amr、spx、pcm 等；文件 ≤ 10MB。
        </small>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }}>
        <button disabled={!canTranscribe} onClick={handleTranscribe}>
          {loading ? '识别中...' : '上传并识别'}
        </button>
        {status && <small style={{ color: '#666' }}>{status}</small>}
      </div>

      {error && (
        <div className="alert error" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>识别结果</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <strong>text：</strong>
              <span style={{ marginLeft: 6 }}>{result.text || '(空)'}</span>
            </div>
            {result.logid && (
              <div>
                <strong>logid：</strong>
                <code style={{ marginLeft: 6 }}>{result.logid}</code>
                <button style={{ marginLeft: 8 }} onClick={() => navigator.clipboard.writeText(result.logid!)}>
                  复制
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}