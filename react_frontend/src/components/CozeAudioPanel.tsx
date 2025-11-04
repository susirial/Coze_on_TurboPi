import { useEffect, useState } from 'react'
import { api, type Voice } from '../lib/api'

type State = {
  loading: boolean
  error?: string
  success?: string
}

export default function CozeAudioPanel() {
  const [state, setState] = useState<State>({ loading: true })
  const [voices, setVoices] = useState<Voice[]>([])
  const [currentVoiceId, setCurrentVoiceId] = useState<string | null>(null)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')

  const loadAll = async () => {
    setState({ loading: true })
    try {
      const [voicesRes, voiceIdRes] = await Promise.all([
        api.listVoices(),
        api.getVoiceId(),
      ])
      const list = voicesRes.data?.voices || []
      setVoices(list)
      const vid = voiceIdRes.data?.voice_id ?? null
      setCurrentVoiceId(vid)
      setSelectedVoiceId(vid || (list[0]?.voice_id || ''))
      setState({ loading: false })
    } catch (e: any) {
      setState({ loading: false, error: e.message || '加载失败' })
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const save = async () => {
    if (!selectedVoiceId) return
    setState({ loading: true })
    try {
      const res = await api.setVoiceId(selectedVoiceId)
      const vid = res.data?.voice_id ?? selectedVoiceId
      setCurrentVoiceId(vid)
      // 本地存储用户音色偏好
      try {
        localStorage.setItem('preferred_voice_id', vid)
      } catch {}
      setState({ loading: false, success: '音色已保存' })
      setTimeout(() => setState((s) => ({ ...s, success: undefined })), 2500)
    } catch (e: any) {
      setState({ loading: false, error: e.message || '保存失败' })
    }
  }

  // 供卡片按钮直接保存指定音色（并作为选择前置）
  const saveVoice = async (voiceId: string) => {
    if (!voiceId) return
    setSelectedVoiceId(voiceId)
    setState({ loading: true })
    try {
      const res = await api.setVoiceId(voiceId)
      const vid = res.data?.voice_id ?? voiceId
      setCurrentVoiceId(vid)
      // 本地存储用户音色偏好
      try {
        localStorage.setItem('preferred_voice_id', vid)
      } catch {}
      setState({ loading: false, success: '音色已保存' })
      setTimeout(() => setState((s) => ({ ...s, success: undefined })), 2500)
    } catch (e: any) {
      setState({ loading: false, error: e.message || '保存失败' })
    }
  }

  return (
    <div className="card" style={{ textAlign: 'left', maxWidth: 1000, margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Coze 音色管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} disabled={state.loading}>
            {state.loading ? '加载中…' : '刷新'}
          </button>
        </div>
      </div>

      {state.error && <div className="alert error">{state.error}</div>}
      {state.success && <div className="alert success">{state.success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h3>当前设置</h3>
          <div style={{ border: '1px solid #e1e5e9', borderRadius: 8, padding: 12, background: '#f8f9fa' }}>
            <div style={{ marginBottom: 12 }}>当前 voice_id：<strong>{currentVoiceId || '未设置'}</strong></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label htmlFor="voice-select">选择音色：</label>
              <select
                id="voice-select"
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                style={{ minWidth: 280 }}
              >
                {voices.map((v) => (
                  <option key={v.voice_id} value={v.voice_id}>
                    {v.name} ({v.voice_id})
                  </option>
                ))}
                {voices.length === 0 && <option value="" disabled>暂无可用音色</option>}
              </select>
              <button className="btn primary" onClick={save} disabled={state.loading || !selectedVoiceId}>
                保存音色
              </button>
            </div>
          </div>
        </div>

        <div>
          <h3>可用音色列表</h3>
          <div style={{ border: '1px solid #e1e5e9', borderRadius: 8, padding: 12, background: '#fff' }}>
            {voices.length === 0 ? (
              <div style={{ color: '#666' }}>暂无数据，请点击刷新或确认后端已配置 Coze。</div>
            ) : (
              <div className="voice-grid">
                {voices.map((v) => {
                  const isSelected = selectedVoiceId === v.voice_id
                  return (
                    <div
                      key={v.voice_id}
                      className={`voice-card${isSelected ? ' selected' : ''}`}
                      onClick={() => setSelectedVoiceId(v.voice_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedVoiceId(v.voice_id)
                        }
                      }}
                      aria-selected={isSelected}
                    >
                      <div className="voice-card-header">
                        <div className="voice-card-title">{v.name}</div>
                        <div className="voice-card-id">{v.voice_id}</div>
                      </div>

                      <div className="voice-card-preview" onClick={(e) => e.stopPropagation()}>
                        {v.preview_audio ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <a href={v.preview_audio} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              打开链接
                            </a>
                            <audio src={v.preview_audio} controls style={{ height: 28 }} onClick={(e) => e.stopPropagation()} />
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>暂无预览</span>
                        )}
                      </div>

                      <div className="voice-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="select-btn"
                          onClick={() => saveVoice(v.voice_id)}
                          disabled={state.loading}
                          title={'保存音色'}
                        >
                          保存音色
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}