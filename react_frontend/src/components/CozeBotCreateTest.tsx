import { useEffect, useState } from 'react'
import { api, type BotCreatePayload, type BotCreateResult } from '../lib/api'

type State = {
  loading: boolean
  error?: string
  result?: BotCreateResult
}

export default function CozeBotCreateTest() {
  const [state, setState] = useState<State>({ loading: false })

  const [workspaceId, setWorkspaceId] = useState<string>('')
  const [name, setName] = useState<string>('测试机器人')
  const [description, setDescription] = useState<string>('用于前端测试创建接口')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [botPrompt, setBotPrompt] = useState<string>('你是一个乐于助人的助手，回答要简洁且可执行。')
  const [prologue, setPrologue] = useState<string>('你好！我可以帮你完成任务，请选择一个开始的问题。')
  const [q1, setQ1] = useState<string>('我可以做什么？')
  const [q2, setQ2] = useState<string>('如何开始一个任务？')
  const [q3, setQ3] = useState<string>('支持哪些功能？')
  const [customizedPrompt, setCustomizedPrompt] = useState<string>('根据上下文生成 3 个高质量的后续追问建议')
  const [modelId, setModelId] = useState<string>('1737521813')
  const [temperature, setTemperature] = useState<number>(0.8)
  const [maxTokens, setMaxTokens] = useState<number>(4000)
  const [responseFormat, setResponseFormat] = useState<string>('markdown')
  const [cozeApiKey, setCozeApiKey] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getConfig(true)
        const cfg = res.data?.config
        setCozeApiKey(cfg?.api_key ?? null)
      } catch {
        setCozeApiKey(null)
      }
    })()
  }, [])

  const onSubmit = async () => {
    setState({ loading: true })
    try {
      // 先检查后端是否已配置正确的 Coze token（include_secrets=true）
      try {
        const cfgRes = await api.getConfig(true)
        const cfg = cfgRes.data?.config as any
        if (!cfg || cfg.llm_provider !== 'coze' || !cfg.api_key) {
          throw new Error('后端未配置有效的 Coze token 或 llm_provider ≠ coze')
        }
      } catch (e: any) {
        throw new Error(e?.message || '无法读取后端密钥配置（include_secrets=true）')
      }

      // 校验：必填
      if (!name.trim()) throw new Error('名称必填')
      if (!botPrompt.trim()) throw new Error('Bot Prompt 必填')
      if (!prologue.trim()) throw new Error('Prologue 必填')
      const questions: [string, string, string] = [q1.trim(), q2.trim(), q3.trim()]
      if (questions.some((q) => !q)) throw new Error('需填写 3 条建议问题')

      // 使用 FormData 以便上传头像文件
      const form = new FormData()
      if (workspaceId) form.append('workspace_id', workspaceId)
      form.append('name', name)
      if (description) form.append('description', description)
      form.append('bot_prompt', botPrompt)
      form.append('prologue', prologue)
      form.append('suggested_questions', questions[0])
      form.append('suggested_questions', questions[1])
      form.append('suggested_questions', questions[2])
      if (customizedPrompt) form.append('customized_prompt', customizedPrompt)
      if (modelId) form.append('model_id', modelId)
      form.append('temperature', String(temperature))
      form.append('max_tokens', String(maxTokens))
      if (responseFormat) form.append('response_format', responseFormat)
      if (avatarFile) form.append('avatar', avatarFile)

      const res = await api.createCozeBot(form)
      setState({ loading: false, result: res.data, error: undefined })
    } catch (e: any) {
      setState({ loading: false, error: e?.message || '创建失败' })
    }
  }

  return (
    <div className="card bot-create-card">
      <div className="card-header bot-create-header">
        <h2>Coze BOT 创建测试</h2>
        <div className="bot-create-controls">
          <span className="bot-create-apikey">
            当前 API 密钥：{cozeApiKey ?? '未加载或不可用'}
          </span>
          <button onClick={onSubmit} disabled={state.loading}>
            {state.loading ? '创建中…' : '提交创建'}
          </button>
        </div>
      </div>

      {state.error && <div className="alert error">{state.error}</div>}

      <div className="bot-create-grid">
        <div className="form-field">
          <label>workspace_id（可选）</label>
          <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="留空则使用后端当前配置" />
        </div>
        <div className="form-field">
          <label>名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>描述（可选）</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label>上传头像（可选）</label>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="form-field full-row">
          <label>Bot Prompt</label>
          <textarea value={botPrompt} onChange={(e) => setBotPrompt(e.target.value)} rows={3} />
        </div>
        <div className="form-field full-row">
          <label>Prologue</label>
          <textarea value={prologue} onChange={(e) => setPrologue(e.target.value)} rows={2} />
        </div>
        <div className="form-field">
          <label>建议问题 1</label>
          <input value={q1} onChange={(e) => setQ1(e.target.value)} />
        </div>
        <div className="form-field">
          <label>建议问题 2</label>
          <input value={q2} onChange={(e) => setQ2(e.target.value)} />
        </div>
        <div className="form-field">
          <label>建议问题 3</label>
          <input value={q3} onChange={(e) => setQ3(e.target.value)} />
        </div>
        <div className="form-field full-row">
          <label>自定义建议回复 Prompt（可选）</label>
          <input value={customizedPrompt} onChange={(e) => setCustomizedPrompt(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Model ID</label>
          <input value={modelId} onChange={(e) => setModelId(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Temperature</label>
          <input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Max Tokens</label>
          <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Response Format</label>
          <input value={responseFormat} onChange={(e) => setResponseFormat(e.target.value)} />
        </div>
      </div>

      {state.result && (
        <div className="bot-create-result">
          <h3>创建结果</h3>
          <pre>
            {JSON.stringify(state.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}