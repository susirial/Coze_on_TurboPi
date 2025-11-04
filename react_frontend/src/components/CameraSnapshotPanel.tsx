import { useState } from 'react'
import { api, type CameraSnapshotRequest, type CameraSnapshotData } from '../lib/api'

export default function CameraSnapshotPanel() {
  const [width, setWidth] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [quality, setQuality] = useState<string>('90')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CameraSnapshotData | null>(null)

  const canSubmit = !loading

  const handleCapture = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const payload: CameraSnapshotRequest = {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      quality: quality ? Number(quality) : undefined,
    }

    try {
      const res = await api.cameraSnapshot(payload)
      setResult(res.data as CameraSnapshotData)
    } catch (e: any) {
      setError(e?.message || '拍摄快照失败')
    } finally {
      setLoading(false)
    }
  }

  const base64 = result?.snapshot?.base64

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2>相机快照测试</h2>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>宽度（可选）</span>
          <input
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="640"
            inputMode="numeric"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>高度（可选）</span>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="480"
            inputMode="numeric"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>JPEG 质量（1–100）</span>
          <input
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            placeholder="90"
            inputMode="numeric"
            style={{ padding: '6px 8px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={!canSubmit} onClick={handleCapture}>
          {loading ? '正在拍摄...' : '拍摄快照'}
        </button>
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      {base64 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <small>保存路径：{result?.snapshot?.saved_path}</small>
            <small>ROS2 话题：{result?.ros2_topic}</small>
            <small>尺寸：{result?.snapshot?.width}×{result?.snapshot?.height}</small>
            <small>质量：{result?.snapshot?.jpeg_quality}</small>
            <small>时间：{result?.snapshot?.timestamp}</small>
          </div>
          <div style={{ border: '1px solid #ddd', padding: 8 }}>
            <img
              src={`data:image/jpeg;base64,${base64}`}
              alt="Camera snapshot"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}