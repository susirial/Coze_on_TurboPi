import React, { useState } from 'react'
import { api, type CozeFileUploadData } from '../lib/api'

type State = {
  loading: boolean
  error?: string
  errorCode?: string
  errorTraceId?: string
  successTraceId?: string
}

export default function CozeFileUploadPanel() {
  const [state, setState] = useState<State>({ loading: false })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<CozeFileUploadData | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setResult(null)
    setState({ loading: false })
  }

  const onUpload = async () => {
    if (!selectedFile) {
      setState({ loading: false, error: '请先选择文件' })
      return
    }
    setState({ loading: true })
    setResult(null)
    try {
      const res = await api.uploadCozeFile(selectedFile)
      setResult(res.data || null)
      setState({ loading: false, successTraceId: res.trace_id })
    } catch (e: any) {
      setResult(null)
      setState({
        loading: false,
        error: e?.message || '上传失败',
        errorCode: e?.code,
        errorTraceId: e?.trace_id,
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Coze 文件上传测试</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="file" onChange={onFileChange} />
        <button onClick={onUpload} disabled={!selectedFile || state.loading}>
          {state.loading ? '上传中...' : '上传到 Coze'}
        </button>
      </div>

      {selectedFile && (
        <div style={{ marginTop: 8 }}>
          <small>
            已选择：{selectedFile.name}（{selectedFile.size} 字节）
          </small>
        </div>
      )}

      {state.error && (
        <div style={{ marginTop: 12, color: '#b00020' }}>
          <div style={{ fontWeight: 600 }}>上传失败</div>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{state.error}</div>
          {state.errorCode && <div style={{ marginTop: 4 }}>错误码: {state.errorCode}</div>}
          {state.errorTraceId && <div style={{ marginTop: 4 }}>trace_id: {state.errorTraceId}</div>}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 600 }}>上传成功</div>
          {state.successTraceId && (
            <div style={{ marginTop: 4 }}>trace_id: {state.successTraceId}</div>
          )}
          <div style={{ marginTop: 6 }}>
            <div>file_id: {result.file_id || '(未返回)'}</div>
          </div>
          {result.file && (
            <details style={{ marginTop: 6 }}>
              <summary>文件元数据</summary>
              <pre style={{ marginTop: 6, padding: 8, background: '#f7f7f7', borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(result.file, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}