import { useEffect, useState } from 'react'
import { api, type CozeBot, type ConfigData } from '../lib/api'

type State = {
  loading: boolean
  error?: string
}

export default function CozeBotsPanel() {
  const [state, setState] = useState<State>({ loading: true })
  const [bots, setBots] = useState<CozeBot[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const load = async () => {
    setState({ loading: true })
    try {
      // 1) 获取有效 workspace_id（不因 bots 列表失败而中断）
      try {
        const wsRes = await api.getCozeWorkspaceId()
        const effectiveId = wsRes.data?.workspace_id ?? null
        if (effectiveId) {
          setWorkspaceId(effectiveId)
        } else {
          // Fallback: 如果后端解析不到，则回退读取配置
          try {
            const confRes = await api.getConfig()
            const conf: ConfigData | undefined = confRes.data?.config
            setWorkspaceId(conf?.coze_workspace_id ?? null)
          } catch {}
        }
      } catch (e: any) {
        // workspace_id 请求失败也尝试回退配置
        try {
          const confRes = await api.getConfig()
          const conf: ConfigData | undefined = confRes.data?.config
          setWorkspaceId(conf?.coze_workspace_id ?? null)
        } catch {}
      }

      // 2) 获取 bots 列表（失败时仅提示错误，不影响 workspace_id 显示）
      try {
        const botsRes = await api.listCozeBots()
        setBots(botsRes.data?.bots || [])
      } catch (e: any) {
        setState((prev) => ({ ...prev, error: e?.message || 'BOT 列表获取失败' }))
      }

      setState((prev) => ({ ...prev, loading: false }))
    } catch (e: any) {
      setState({ loading: false, error: e.message || '加载失败' })
    }
  }

  useEffect(() => {
    load()
  }, [])

  const fmtTime = (ts?: number) => {
    if (!ts) return '—'
    try { return new Date(ts * 1000).toLocaleString() } catch { return String(ts) }
  }

  return (
    <div className="card" style={{ textAlign: 'left', maxWidth: 1100, margin: '0 auto' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Coze BOT 列表</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={state.loading}>
            {state.loading ? '加载中…' : '刷新'}
          </button>
        </div>
      </div>

      {state.error && <div className="alert error">{state.error}</div>}

      <div style={{ marginBottom: 12, color: '#444' }}>
        当前 workspace_id：<strong>{workspaceId || '未设置'}</strong>
      </div>

      <div style={{ border: '1px solid #e1e5e9', borderRadius: 8, padding: 12 }}>
        {bots.length === 0 ? (
          <div style={{ color: '#666' }}>暂无 BOT 数据，请点击刷新或确认后端已配置 Coze。</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>名称</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>ID</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>描述</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>发布</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>更新时间</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e1e5e9', paddingBottom: 8 }}>图标</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((b) => (
                <tr key={b.id}>
                  <td style={{ padding: '6px 0' }}>{b.name}</td>
                  <td style={{ padding: '6px 0', fontFamily: 'monospace' }}>{b.id}</td>
                  <td style={{ padding: '6px 0' }}>{b.description || '—'}</td>
                  <td style={{ padding: '6px 0' }}>
                    {b.is_published ? (
                      <span title={`发布于 ${fmtTime(b.published_at)}`}>已发布</span>
                    ) : (
                      <span>未发布</span>
                    )}
                  </td>
                  <td style={{ padding: '6px 0' }}>{fmtTime(b.updated_at)}</td>
                  <td style={{ padding: '6px 0' }}>
                    {b.icon_url ? (
                      <img src={b.icon_url} alt={b.name} style={{ width: 28, height: 28, borderRadius: 4 }} />
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}