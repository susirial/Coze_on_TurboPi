import { useState } from 'react'
import { api, type BotRetrieveResult } from '../lib/api'

type State = {
  loading: boolean
  error?: string
  errorCode?: string
  errorTraceId?: string
  errorDetails?: any
  result?: BotRetrieveResult
}

export default function CozeBotRetrievePanel() {
  const [botId, setBotId] = useState<string>('')
  const [state, setState] = useState<State>({ loading: false })

  const canSubmit = !!botId && !state.loading

  const onSubmit = async () => {
    if (!botId.trim()) {
      setState({ loading: false, error: '请先填写 Bot ID' })
      return
    }
    setState({ loading: true })
    try {
      const res = await api.getCozeBot(botId.trim())
      setState({ loading: false, result: res.data, error: undefined })
    } catch (e: any) {
      setState({
        loading: false,
        error: e?.message || '查询失败',
        errorCode: e?.code,
        errorTraceId: e?.trace_id,
        errorDetails: e?.details,
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>查询 Coze Bot 详情</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label htmlFor="botId">Bot ID：</label>
        <input
          id="botId"
          type="text"
          placeholder="请输入 Bot ID"
          value={botId}
          onChange={(e) => setBotId(e.target.value)}
          style={{ minWidth: 300 }}
        />
        <button onClick={onSubmit} disabled={!canSubmit}>
          {state.loading ? '查询中...' : '查询'}
        </button>
      </div>

      {state.error && (
        <div style={{ marginTop: 12, color: '#b00020' }}>
          <div style={{ fontWeight: 600 }}>查询失败</div>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{state.error}</div>
          {state.errorCode && (
            <div style={{ marginTop: 4 }}>错误码: {state.errorCode}</div>
          )}
          {state.errorTraceId && (
            <div style={{ marginTop: 4 }}>trace_id: {state.errorTraceId}</div>
          )}
          {state.errorDetails && (
            <details style={{ marginTop: 6 }}>
              <summary>详细信息</summary>
              <pre style={{ marginTop: 6, padding: 8, background: '#f7f7f7', borderRadius: 4, overflow: 'auto' }}>
                {JSON.stringify(state.errorDetails, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {state.result && (
        <div style={{ marginTop: 16 }}>
          <h3>查询结果</h3>
          {state.result.logid && (
            <div style={{ marginBottom: 8 }}>logid: {state.result.logid}</div>
          )}
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxWidth: '100%', overflow: 'auto' }}>
            {JSON.stringify(state.result.bot, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}