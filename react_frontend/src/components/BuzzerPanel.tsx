import { useState } from 'react'
import { api, type BuzzerSetRequest, type BuzzerSetData } from '../lib/api'

export default function BuzzerPanel() {
  const [freq, setFreq] = useState<string>('1900')
  const [onTime, setOnTime] = useState<string>('0.2')
  const [offTime, setOffTime] = useState<string>('0.01')
  const [repeat, setRepeat] = useState<string>('0')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BuzzerSetData | null>(null)

  const canSubmit = !loading

  const handleSet = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const payload: BuzzerSetRequest = {
      freq: freq ? Number(freq) : undefined,
      on_time: onTime ? Number(onTime) : undefined,
      off_time: offTime ? Number(offTime) : undefined,
      repeat: repeat ? Number(repeat) : undefined,
    }

    try {
      const res = await api.buzzerSet(payload)
      setResult(res.data as BuzzerSetData)
    } catch (e: any) {
      setError(e?.message || '设置蜂鸣器失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2>蜂鸣器测试</h2>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>频率 (Hz)</span>
          <input
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
            placeholder="1900"
            inputMode="numeric"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>开时间 (秒)</span>
          <input
            value={onTime}
            onChange={(e) => setOnTime(e.target.value)}
            placeholder="0.2"
            inputMode="decimal"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>关时间 (秒)</span>
          <input
            value={offTime}
            onChange={(e) => setOffTime(e.target.value)}
            placeholder="0.01"
            inputMode="decimal"
            style={{ padding: '6px 8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>重复次数</span>
          <input
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            style={{ padding: '6px 8px' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={!canSubmit} onClick={handleSet}>
          {loading ? '正在设置...' : '触发蜂鸣器'}
        </button>
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      {result && (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <small>ROS2 话题：{result.ros2_topic || 'simulation'}</small>
            <small>运行模式：{result.runtime_mode}</small>
            <small>时间：{result.buzzer?.timestamp}</small>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ border: '1px solid #ddd', padding: 8 }}>
              <strong>参数</strong>
              <div style={{ display: 'grid', gap: 4 }}>
                <small>频率：{result.buzzer?.freq} Hz</small>
                <small>开：{result.buzzer?.on_time} s</small>
                <small>关：{result.buzzer?.off_time} s</small>
                <small>重复：{result.buzzer?.repeat}</small>
              </div>
            </div>
            <div style={{ border: '1px solid #ddd', padding: 8 }}>
              <strong>JSON 返回</strong>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}