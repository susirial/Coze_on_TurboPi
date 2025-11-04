import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { HealthData, SystemStatus, SuccessResponse } from '../lib/api'

type StatusState = {
  loading: boolean
  error?: string
  health?: SuccessResponse<HealthData>
  status?: SuccessResponse<SystemStatus>
}

export function StatusCard() {
  const [state, setState] = useState<StatusState>({ loading: true })

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }))
    try {
      const [health, status] = await Promise.all([api.getHealth(), api.getStatus()])
      setState({ loading: false, health, status })
    } catch (e: any) {
      setState({ loading: false, error: e.message })
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 10_000)
    return () => clearInterval(timer)
  }, [])

  const health = state.health?.data
  const status = state.status?.data

  return (
    <div className="card">
      <div className="card-header">
        <h2>服务状态</h2>
        <button className="btn" onClick={load} disabled={state.loading}>
          {state.loading ? '刷新中…' : '刷新'}
        </button>
      </div>
      {state.error && <div className="alert error">{state.error}</div>}
      <div className="grid grid-2">
        <div className="panel">
          <h3>Health</h3>
          {!health ? (
            <div className="skeleton" />
          ) : (
            <ul className="kv">
              <li>
                <span>状态</span>
                <strong className={health.status === 'healthy' ? 'ok' : 'warn'}>
                  {health.status}
                </strong>
              </li>
              <li>
                <span>运行模式</span>
                <strong>{health.runtime_mode}</strong>
              </li>
              <li>
                <span>运行时初始化</span>
                <strong>{health.runtime_initialized ? '是' : '否'}</strong>
              </li>
              <li>
                <span>提供者可用</span>
                <strong>{health.provider_available ? '是' : '否'}</strong>
              </li>
              <li>
                <span>启动时长</span>
                <strong>{health.uptime_seconds.toFixed(1)}s</strong>
              </li>
              <li>
                <span>时间戳</span>
                <strong>{new Date(health.timestamp).toLocaleString()}</strong>
              </li>
            </ul>
          )}
        </div>
        <div className="panel">
          <h3>系统状态</h3>
          {!status ? (
            <div className="skeleton" />
          ) : (
            <ul className="kv">
              <li>
                <span>服务名</span>
                <strong>{status.service_name}</strong>
              </li>
              <li>
                <span>端口</span>
                <strong>{status.port}</strong>
              </li>
              <li>
                <span>运行模式</span>
                <strong>{status.runtime_mode}</strong>
              </li>
              <li>
                <span>小车状态</span>
                <strong>{status.car_state.status}</strong>
              </li>
              {!!status.car_state.last_command && (
                <li>
                  <span>最后指令</span>
                  <strong>{status.car_state.last_command}</strong>
                </li>
              )}
              {!!status.car_state.last_command_time && (
                <li>
                  <span>指令时间</span>
                  <strong>
                    {new Date(status.car_state.last_command_time).toLocaleString()}
                  </strong>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}