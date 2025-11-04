import React, { useMemo, useState, useEffect, useRef } from 'react'
import { api, type CameraSnapshotData, type StreamChatRequest, type MoveCommand } from '../lib/api'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'image'
  content: string
}

export default function CozeNavigationDialogPanel() {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [navBotId, setNavBotId] = useState('')
  const [imageBotId, setImageBotId] = useState('')
  const [userId, setUserId] = useState('')
  const [goalText, setGoalText] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch (e) {
      console.error('复制失败：', e)
    }
  }

  const [imageConversationId, setImageConversationId] = useState<string | null>(null)
  const [navConversationId, setNavConversationId] = useState<string | null>(null)
  // 已执行的工具调用去重（避免重复执行）
  const executedToolsRef = useRef<Set<string>>(new Set())
  // 跟踪当前导航回复的流式助手气泡索引，避免覆盖行动气泡
  const streamingAssistantIndexRef = useRef<number | null>(null)
  // 可选：积累需要在完成后补充的行动气泡（当前实现直接即时追加，不使用该队列）
  const pendingActionBubblesRef = useRef<string[]>([])

  // 仅在助手消息到达且用户未上滑时自动滚动到底部
  useEffect(() => {
    const el = chatContainerRef.current
    if (!el) return
    const lastRole = chat[chat.length - 1]?.role
    if (lastRole === 'assistant' && atBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [chat, atBottom])

  const onChatScroll = () => {
    const el = chatContainerRef.current
    if (!el) return
    const epsilon = 40
    const isNearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < epsilon
    setAtBottom(isNearBottom)
  }

  // Helpers
  const canSend = useMemo(() => {
    return !busy && !!navBotId.trim() && !!imageBotId.trim() && !!goalText.trim()
  }, [busy, navBotId, imageBotId, goalText])

  const addMsg = (msg: ChatMessage) => setChat(prev => [...prev, msg])

  const resetDialog = () => {
    setChat([])
    setError(null)
    setImageConversationId(null)
    setNavConversationId(null)
    executedToolsRef.current.clear()
  }

  const base64ToFile = (base64: string, filename = 'snapshot.jpg'): File => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })
    return new File([blob], filename, { type: 'image/jpeg' })
  }

  const streamImageRecognition = async (file: File, text: string, botId: string, userId?: string, conversationId?: string) => {
    let assistantBuffer = ''
    for await (const event of api.imageChatStream({ file, text, bot_id: botId, user_id: userId, conversation_id: conversationId })) {
      if (event.type === 'conversation_id' && event.content) {
        const cid = event.content as string
        setImageConversationId(cid)
        addMsg({ role: 'system', content: `图片识别会话ID：${cid}` })
      } else if (event.type === 'content' && event.content) {
        // 保护拼接，避免 undefined 导致类型报错
        assistantBuffer += event.content ?? ''
        // Replace or append last assistant chunk
        setChat(prev => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = { role: 'assistant', content: assistantBuffer }
          } else {
            updated.push({ role: 'assistant', content: assistantBuffer })
          }
          return updated
        })
      } else if (event.type === 'completed' && event.content) {
        // ensure final content set
        setChat(prev => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
            updated[lastIndex] = { role: 'assistant', content: String(event.content ?? '') }
          } else {
            updated.push({ role: 'assistant', content: String(event.content ?? '') })
          }
          return updated
        })
        // 返回最终内容（若为空则回退到累计缓冲或 null）
        return event.content ?? (assistantBuffer || null)
      } else if (event.type === 'error') {
        const msg = `图片识别出错：${event.content || '未知错误'}${event.error_code ? ` (${event.error_code})` : ''}`
        setError(msg)
        addMsg({ role: 'system', content: msg })
        return null
      }
    }
    return assistantBuffer || null
  }

  // 工具调用处理：识别插件JSON并执行机器人控制
  const PLUGIN_NAME_ROBOT_CTRL = 'robot_ctrl'
  const DEFAULT_SPEED = 0.5
  const DEFAULT_DURATION_MS = 300

  const cmdToLabel = (cmd: string): string => {
    switch (cmd) {
      case 'forward': return '前进'
      case 'backward': return '后退'
      case 'left': return '左移'
      case 'right': return '右移'
      case 'forward_left': return '左前'
      case 'forward_right': return '右前'
      case 'backward_left': return '左后'
      case 'backward_right': return '右后'
      case 'stop': return '停止'
      case 'estop': return '急停'
      default: return cmd
    }
  }

  // 全局移除锚点标签，保留其文本或 URL
  const removeAnchorTags = (s: string) => s.replace(/<a[^>]*>(.*?)<\/a>/g, '$1')

  // 从任意文本中提取第一个看起来完整的 JSON 对象（容错：支持“说明文字 + JSON”）
  const extractFirstJsonObject = (s: string): any | null => {
    const candidates: string[] = []
    let depth = 0
    let start = -1
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (ch === '{') {
        if (depth === 0) start = i
        depth++
      } else if (ch === '}') {
        if (depth > 0) {
          depth--
          if (depth === 0 && start >= 0) {
            candidates.push(s.slice(start, i + 1))
            start = -1
          }
        }
      }
    }
    for (const c of candidates) {
      try {
        const o = JSON.parse(c)
        if (o && typeof o === 'object') return o
      } catch {}
    }
    return null
  }

  const normalizeCmd = (raw?: string): string | null => {
    if (!raw) return null
    const s = String(raw).toLowerCase().trim()
    // 常见别名归一化
    if (s === 'forward' || s === 'move_forward' || s === 'front' || s === 'move_front') return 'forward'
    if (s === 'backward' || s === 'move_backward' || s === 'back' || s === 'move_back') return 'backward'
    if (s === 'left' || s === 'move_left' || s === 'turn_left') return 'left'
    if (s === 'right' || s === 'move_right' || s === 'turn_right') return 'right'
    if (s === 'forward_left' || s === 'move_forward_left') return 'forward_left'
    if (s === 'forward_right' || s === 'move_forward_right') return 'forward_right'
    if (s === 'backward_left' || s === 'move_backward_left' || s === 'back_left' || s === 'move_back_left') return 'backward_left'
    if (s === 'backward_right' || s === 'move_backward_right' || s === 'back_right' || s === 'move_back_right') return 'backward_right'
    if (s === 'stop' || s === 'halt') return 'stop'
    if (s === 'emergency_stop' || s === 'estop' || s === 'e_stop') return 'estop'
    return s
  }

  const cmdToMoveCommand = (cmd: string): MoveCommand['command'] | null => {
    switch (cmd) {
      case 'forward':
      case 'backward':
      case 'left':
      case 'right':
      case 'forward_left':
      case 'forward_right':
      case 'backward_left':
      case 'backward_right':
        return cmd as MoveCommand['command']
      default:
        return null
    }
  }

  const executeRobotCmd = async (
    cmdRaw: string,
    opts?: { speed?: number; duration_ms?: number }
  ) => {
    const cmd = normalizeCmd(cmdRaw)
    if (!cmd) return false

    // 构造去重key（同一会话避免重复执行）
    const key = `${PLUGIN_NAME_ROBOT_CTRL}:${cmd}:${navConversationId || 'no-conv'}`
    if (executedToolsRef.current.has(key)) {
      addMsg({ role: 'system', content: `⚠️ 已检测为重复调用，已忽略：${key}` })
      return false
    }
    executedToolsRef.current.add(key)

    // 输出系统提示
    addMsg({ role: 'system', content: `🔧 收到工具调用：${PLUGIN_NAME_ROBOT_CTRL}（cmd=${cmd}）` })

    try {
      if (cmd === 'stop') {
        addMsg({ role: 'system', content: '🛑 执行停止...' })
        const res = await api.stop()
        addMsg({ role: 'system', content: `✅ 停止完成：${res.message}` })
        // 追加一个 AI 行动气泡
        addMsg({ role: 'assistant', content: `行动：${cmdToLabel(cmd)}（已完成）` })
        return true
      }
      if (cmd === 'estop') {
        addMsg({ role: 'system', content: '⛔ 执行急停...' })
        const res = await api.estop()
        addMsg({ role: 'system', content: `✅ 急停完成：${res.message}` })
        // 追加一个 AI 行动气泡
        addMsg({ role: 'assistant', content: `行动：${cmdToLabel(cmd)}（已完成）` })
        return true
      }

      const moveCommand = cmdToMoveCommand(cmd)
      if (moveCommand) {
        const speed = typeof opts?.speed === 'number' ? Math.max(0, Math.min(1, opts.speed)) : DEFAULT_SPEED
        const duration = typeof opts?.duration_ms === 'number' ? Math.max(0, Math.min(10000, opts.duration_ms)) : DEFAULT_DURATION_MS
        addMsg({ role: 'system', content: `🚗 执行移动：${moveCommand}（速度=${speed}, 时长=${duration}ms）` })
        const payload: MoveCommand = { command: moveCommand, speed, duration_ms: duration }
        const res = await api.move(payload)
        addMsg({ role: 'system', content: `✅ 移动完成：${res.message}` })
        // 追加一个 AI 行动气泡
        addMsg({ role: 'assistant', content: `行动：${cmdToLabel(cmd)}（速度=${speed}，时长=${duration}ms）` })
        return true
      }

      addMsg({ role: 'system', content: `⚠️ 未知命令：${cmd}` })
      return false
    } catch (e: any) {
      addMsg({ role: 'system', content: `❌ 工具执行失败：${e?.message || '未知错误'}` })
      return false
    }
  }

  const tryHandlePluginCall = async (maybeContent: string): Promise<boolean> => {
    // 放宽解析：支持“说明文字 + JSON”，并去除不可见控制符与锚点标签
    const text = String(maybeContent || '').trim()
    const sanitized = removeAnchorTags(text.replace(/[\u0000-\u001F]/g, ''))
    try {
      let parsed: any = null
      if (sanitized.startsWith('{')) {
        parsed = JSON.parse(sanitized)
      } else {
        parsed = extractFirstJsonObject(sanitized)
      }
      if (!parsed || typeof parsed !== 'object') return false
      const pluginName: string | undefined = parsed?.plugin_name || parsed?.plugin || parsed?.api_name || parsed?.name
      const args = parsed?.arguments || {}
      const cmdField = args?.cmd ?? args?.command
      let rawCmd: string | undefined = undefined
      if (typeof cmdField === 'string') {
        rawCmd = cmdField
      } else if (cmdField && typeof cmdField === 'object') {
        // 兼容 { cmd: { type: 'move_right' } } 或其他键名
        rawCmd = cmdField.type || cmdField.name || cmdField.action || cmdField.cmd || cmdField.command
      }
      // 读取可选速度与时长
      const speedOverride = typeof args?.speed === 'number' ? args.speed : (cmdField && typeof cmdField === 'object' && typeof cmdField.speed === 'number' ? cmdField.speed : undefined)
      const durationOverride = typeof args?.duration_ms === 'number' ? args.duration_ms : (cmdField && typeof cmdField === 'object' && typeof cmdField.duration_ms === 'number' ? cmdField.duration_ms : undefined)
      if (typeof pluginName === 'string' && pluginName.toLowerCase().includes(PLUGIN_NAME_ROBOT_CTRL)) {
        if (typeof rawCmd === 'string' && rawCmd.trim()) {
          return await executeRobotCmd(rawCmd, { speed: speedOverride, duration_ms: durationOverride })
        }
        addMsg({ role: 'system', content: '⚠️ 工具调用参数缺失：未提供 cmd 或 cmd.type' })
        return false
      }
    } catch {
      // 非JSON或不完整，忽略
    }
    return false
  }

  const streamNavigation = async (message: string, botId: string, userId?: string, conversationId?: string) => {
    const req: StreamChatRequest = { text: message, bot_id: botId, user_id: userId, conversation_id: conversationId || undefined }
    let currentConv = conversationId || null
    let assistantBuffer = ''
    // 每次启动新一轮导航流时重置去重集合（仅对当前轮去重）
    executedToolsRef.current.clear()
    for await (const event of api.streamChatUnified(req)) {
      if (event.type === 'conversation_id' && event.content) {
        const cid = event.content as string
        currentConv = cid
        setNavConversationId(cid)
        addMsg({ role: 'system', content: `导航会话ID：${cid}` })
      } else if (event.type === 'content' && event.content) {
        // 尝试解析并处理插件工具调用
        await tryHandlePluginCall(String(event.content))
        // 保护拼接，避免 undefined 导致类型报错
        assistantBuffer += event.content ?? ''
        setChat(prev => {
          const updated = [...prev]
          // 若尚未创建流式助手气泡，则新建并记录索引；否则更新该索引处的气泡
          if (streamingAssistantIndexRef.current === null) {
            updated.push({ role: 'assistant', content: assistantBuffer })
            streamingAssistantIndexRef.current = updated.length - 1
          } else if (streamingAssistantIndexRef.current >= 0 && streamingAssistantIndexRef.current < updated.length) {
            updated[streamingAssistantIndexRef.current] = { role: 'assistant', content: assistantBuffer }
          } else {
            // 索引异常时兜底追加
            updated.push({ role: 'assistant', content: assistantBuffer })
            streamingAssistantIndexRef.current = updated.length - 1
          }
          return updated
        })
      } else if (event.type === 'completed' && event.content) {
        // 完成事件也尝试处理工具调用（兜底）
        await tryHandlePluginCall(String(event.content))
        setChat(prev => {
          const updated = [...prev]
          const finalText = String(event.content ?? '')
          if (streamingAssistantIndexRef.current === null) {
            updated.push({ role: 'assistant', content: finalText })
          } else if (streamingAssistantIndexRef.current >= 0 && streamingAssistantIndexRef.current < updated.length) {
            updated[streamingAssistantIndexRef.current] = { role: 'assistant', content: finalText }
          } else {
            updated.push({ role: 'assistant', content: finalText })
          }
          // 完成后重置索引，确保后续行动气泡或消息不受影响
          streamingAssistantIndexRef.current = null
          return updated
        })
        break
      } else if (event.type === 'error') {
        const msg = `导航对话出错：${event.content || '未知错误'}${event.error_code ? ` (${event.error_code})` : ''}`
        setError(msg)
        addMsg({ role: 'system', content: msg })
        break
      }
    }
  }

  const handleSend = async () => {
    if (!canSend) return
    setBusy(true)
    setError(null)

    try {
      // 1) 记录用户目标
      addMsg({ role: 'user', content: `目标：${goalText}` })
      addMsg({ role: 'system', content: '📷 正在拍照...' })

      // 2) 拍照
      const snap = await api.cameraSnapshot({})
      const data = snap.data as CameraSnapshotData
      const base64 = data?.snapshot?.base64
      if (!base64) {
        throw new Error('后端返回的快照数据为空')
      }
      const file = base64ToFile(base64)
      addMsg({ role: 'image', content: `data:image/jpeg;base64,${base64}` })
      addMsg({ role: 'system', content: '🧠 图片识别中...' })

      // 3) 调用图片识别 bot（使用用户目标作为提示词，可在此附加更明确要求）
      const imageAnalysis = await streamImageRecognition(
        file,
        goalText,
        imageBotId,
        userId || undefined,
        imageConversationId || undefined,
      )
      if (!imageAnalysis) {
        throw new Error('图片识别失败，无法继续导航对话')
      }

      // 4) 合并提示词，传递给导航 bot
      const mergedPrompt = `请基于以下信息给出导航建议：\n- 用户目标：${goalText}\n- 当前环境：${imageAnalysis}`
      addMsg({ role: 'system', content: '🧭 正在向导航 Bot 发送合并提示词...' })
      await streamNavigation(mergedPrompt, navBotId, userId || undefined, navConversationId || undefined)
    } catch (e: any) {
      setError(e?.message || '复合对话流程失败')
      addMsg({ role: 'system', content: `❌ ${e?.message || '复合对话流程失败'}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h2>导航对话（拍照→图片识别→导航建议）</h2>
      <p style={{ color: '#666', marginTop: -8 }}>设置两个 Bot ID 和目标，点击发送后自动拍照，先进行图片识别，再将识别结果与目标合并提示给导航 Bot，并以对话形式流式显示。</p>

      <div style={{ display: 'grid', gap: 10, maxWidth: 900 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ minWidth: 120 }}>导航 Bot ID</label>
          <input
            value={navBotId}
            onChange={(e) => setNavBotId(e.target.value)}
            placeholder="输入导航 Coze Bot ID"
            disabled={busy}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ minWidth: 120 }}>图片识别 Bot ID</label>
          <input
            value={imageBotId}
            onChange={(e) => setImageBotId(e.target.value)}
            placeholder="输入图片识别 Coze Bot ID"
            disabled={busy}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ minWidth: 120 }}>User ID（可选）</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="用于区分同一用户的会话"
            disabled={busy}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ minWidth: 120 }}>目标/提示词</label>
          <input
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="例如：从当前位置前往前方路口右转"
            disabled={busy}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleSend} disabled={!canSend}>
            {busy ? '处理中...' : '发送'}
          </button>
          <button onClick={resetDialog} disabled={busy}>
            重置会话
          </button>
          {error && <span style={{ color: 'red' }}>{error}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <h3>对话</h3>
        <div className="messages-container" ref={chatContainerRef} onScroll={onChatScroll} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12, display: 'grid', gap: 12, maxHeight: '50vh', overflowY: 'auto' }}>
          {chat.length === 0 && <div style={{ color: '#888' }}>暂无对话，填写信息后点击“发送”。</div>}
          {chat.map((m, idx) => (
            <div key={idx} style={{ display: 'grid', gap: 6 }}>
              <small style={{ color: '#666' }}>{m.role === 'user' ? '用户' : m.role === 'assistant' ? 'AI' : m.role === 'image' ? '图片' : '系统'}</small>
              {m.role === 'image' ? (
                <img src={m.content} alt={`snapshot-${idx}`} style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', position: 'relative' }}>
                  {m.content}
                  {m.role === 'assistant' && (
                    <button
                      className={`copy-btn ${copiedIndex === idx ? 'copied' : ''}`}
                      onClick={() => copyMessage(String(m.content ?? ''), idx)}
                      aria-label="复制助手消息"
                      title={copiedIndex === idx ? '已复制' : '复制'}
                    >
                      {copiedIndex === idx ? '已复制' : '复制'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}