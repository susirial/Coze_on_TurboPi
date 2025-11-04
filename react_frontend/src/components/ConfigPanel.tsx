import { useState, useEffect } from 'react'
import { api, type ConfigData } from '../lib/api'
import '../config-styles.css'

export function ConfigPanel() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<any | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [includeSecrets, setIncludeSecrets] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<ConfigData>({
    api_key: '',
    llm_provider: 'openai',
    telemetry_enabled: false,
    discovery_enabled: true,
    allowed_origins: [],
    notes: '',
    coze_workspace_id: ''
  })
  
  const [newOrigin, setNewOrigin] = useState('')

  // Load configuration on component mount
  useEffect(() => {
    loadConfig()
  }, [includeSecrets])

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    setErrorDetails(null)
    try {
      const response = await api.getConfig(includeSecrets)
      if (response.data?.config) {
        setConfig(response.data.config)
        setFormData(response.data.config)
        setSuccess('配置加载成功')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      const anyErr = err as any
      const message = anyErr?.message || '加载配置失败'
      const code = anyErr?.code ? ` [${anyErr.code}]` : ''
      const traceId = anyErr?.trace_id ? ` (trace_id: ${anyErr.trace_id})` : ''
      setError(`${message}${code}${traceId}`)
      setErrorDetails(anyErr?.details ?? null)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setLoading(true)
    setError(null)
    setErrorDetails(null)
    try {
      const response = await api.updateConfig(formData)
      if (response.data?.config) {
        setConfig(response.data.config)
        setSuccess('配置保存成功')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      const anyErr = err as any
      const message = anyErr?.message || '保存配置失败'
      const code = anyErr?.code ? ` [${anyErr.code}]` : ''
      const traceId = anyErr?.trace_id ? ` (trace_id: ${anyErr.trace_id})` : ''
      setError(`${message}${code}${traceId}`)
      setErrorDetails(anyErr?.details ?? null)
    } finally {
      setLoading(false)
    }
  }

  const resetConfig = async () => {
    if (!confirm('确定要重置配置到默认值吗？')) return
    
    setLoading(true)
    setError(null)
    setErrorDetails(null)
    try {
      const response = await api.resetConfig()
      if (response.data?.config) {
        setConfig(response.data.config)
        setFormData(response.data.config)
        setSuccess('配置已重置为默认值')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      const anyErr = err as any
      const message = anyErr?.message || '重置配置失败'
      const code = anyErr?.code ? ` [${anyErr.code}]` : ''
      const traceId = anyErr?.trace_id ? ` (trace_id: ${anyErr.trace_id})` : ''
      setError(`${message}${code}${traceId}`)
      setErrorDetails(anyErr?.details ?? null)
    } finally {
      setLoading(false)
    }
  }

  const addOrigin = () => {
    if (newOrigin.trim() && !formData.allowed_origins.includes(newOrigin.trim())) {
      setFormData({
        ...formData,
        allowed_origins: [...formData.allowed_origins, newOrigin.trim()]
      })
      setNewOrigin('')
    }
  }

  const removeOrigin = (index: number) => {
    setFormData({
      ...formData,
      allowed_origins: formData.allowed_origins.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="config-panel">
      <div className="config-header">
        <h2>配置管理</h2>
        <div className="config-actions">
          <div className="checkbox-inline">
            <input
              type="checkbox"
              checked={includeSecrets}
              onChange={(e) => setIncludeSecrets(e.target.checked)}
            />
            <span>显示敏感信息</span>
          </div>
          <button onClick={loadConfig} disabled={loading}>
            {loading ? '加载中...' : '刷新配置'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>错误：</strong> {error}
          {errorDetails && (
            <div className="error-details">
              <pre>{JSON.stringify(errorDetails, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>成功：</strong> {success}
        </div>
      )}

      {config && (
        <div className="config-content">
          <div className="config-section">
            <h3>当前配置</h3>
            <div className="config-display">
              <pre>{JSON.stringify(config, null, 2)}</pre>
            </div>
          </div>

          <div className="config-section">
            <h3>编辑配置</h3>
            <form onSubmit={(e) => { e.preventDefault(); saveConfig(); }}>
              <div className="form-group">
                <label htmlFor="api_key">API 密钥：</label>
                <div className="input-with-toggle">
                  <input
                    id="api_key"
                    type={showApiKey ? "text" : "password"}
                    value={formData.api_key || ''}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value || null })}
                    placeholder="输入 API 密钥"
                  />
                  <button
                    type="button"
                    className="toggle-visibility-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "隐藏 API 密钥" : "显示 API 密钥"}
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="llm_provider">LLM 提供商：</label>
                <select
                  id="llm_provider"
                  value={formData.llm_provider}
                  onChange={(e) => setFormData({ ...formData, llm_provider: e.target.value })}
                >
                  <option value="openai">OpenAI</option>
                  <option value="azure_openai">Azure OpenAI</option>
                  <option value="ollama">Ollama</option>
                  <option value="coze">扣子智能体</option>
                </select>
              </div>

              <div className="form-group">
                <div className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={formData.telemetry_enabled}
                    onChange={(e) => setFormData({ ...formData, telemetry_enabled: e.target.checked })}
                  />
                  <span>启用遥测</span>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={formData.discovery_enabled}
                    onChange={(e) => setFormData({ ...formData, discovery_enabled: e.target.checked })}
                  />
                  <span>启用服务发现</span>
                </div>
              </div>

              <div className="form-group">
                <label>允许的来源：</label>
                <div className="origins-list">
                  {formData.allowed_origins.map((origin, index) => (
                    <div key={index} className="origin-item">
                      <span>{origin}</span>
                      <button
                        type="button"
                        onClick={() => removeOrigin(index)}
                        className="remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-origin">
                  <input
                    type="text"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="添加新的来源 URL"
                    onKeyPress={(e) => e.key === 'Enter' && addOrigin()}
                  />
                  <button type="button" onClick={addOrigin}>
                    添加
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="coze_workspace_id">扣子空间ID：</label>
                <input
                  id="coze_workspace_id"
                  type="text"
                  value={formData.coze_workspace_id || ''}
                  onChange={(e) => setFormData({ ...formData, coze_workspace_id: e.target.value || null })}
                  placeholder="输入 Coze Workspace ID"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">备注：</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="输入配置备注"
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '保存中...' : '保存配置'}
                </button>
                <button type="button" onClick={resetConfig} disabled={loading} className="btn-secondary">
                  重置为默认值
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}