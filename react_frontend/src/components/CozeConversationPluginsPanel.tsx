import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, type ConversationCreateRequest, type ConversationMessage, type StreamChatRequest, type MoveCommand, type CameraSnapshotData } from '../lib/api'

interface ConversationItem {
  id: string
  messages: ConversationMessage[]
  createdAt: Date
}

export default function CozeConversationPluginsPanel() {
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [botId, setBotId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // 插件调用队列与去重
  type PluginCall = {
    plugin_name: string
    arguments?: Record<string, any>
    plugin_icon?: string
  }
  const pendingToolsRef = useRef<Record<string, PluginCall[]>>({})
  const executedToolsRef = useRef<Record<string, string[]>>({})
  // 当 conversation_id 尚未到达时，暂存解析到的插件调用
  const pendingBeforeConvRef = useRef<PluginCall[]>([])

  const ALLOWED_PLUGIN_NAMES = new Set(['robot_ctrl', 'take_photo_for_recognition'])

  const stableStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
    if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']'
    const keys = Object.keys(obj).sort()
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
  }

  const buildCallKey = (call: PluginCall) => `${call.plugin_name}|${stableStringify(call.arguments ?? {})}`

  // 全局移除锚点标签，保留其文本或 URL
  const removeAnchorTags = (s: string) => s.replace(/<a[^>]*>(.*?)<\/a>/g, '$1')

  // 从任意文本中提取第一个看起来完整的 JSON 对象
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

  const appendAssistantMessage = (conversationId: string | undefined, text: string) => {
    if (!conversationId) return
    setConversations(prev => prev.map(conv => {
      if (conv.id !== conversationId) return conv
      return { ...conv, messages: [...conv.messages, { role: 'assistant', content: text }] }
    }))
  }

  // 规范化机器人控制命令
  const normalizeCmd = (cmd: string): MoveCommand['command'] | 'stop' | 'estop' => {
    const m = String(cmd || '').toLowerCase().replace(/\s+/g, '_')
    switch (m) {
      case 'front':
      case 'move_front':
      case 'move_forward':
      case 'forward':
        return 'forward'
      case 'back':
      case 'move_back':
      case 'move_backward':
      case 'backward':
        return 'backward'
      case 'move_left':
      case 'turn_left':
      case 'left':
        return 'left'
      case 'move_right':
      case 'turn_right':
      case 'right':
        return 'right'
      case 'move_forward_left':
      case 'forward_left':
        return 'forward_left'
      case 'move_forward_right':
      case 'forward_right':
        return 'forward_right'
      case 'move_back_left':
      case 'back_left':
      case 'move_backward_left':
      case 'backward_left':
        return 'backward_left'
      case 'move_back_right':
      case 'back_right':
      case 'move_backward_right':
      case 'backward_right':
        return 'backward_right'
      case 'stop':
      case 'halt':
        return 'stop'
      case 'estop':
      case 'e_stop':
      case 'emergency_stop':
        return 'estop'
      default:
        return 'stop'
    }
  }

  const cmdToMoveCommand = (cmd: MoveCommand['command'], args?: Record<string, any>): MoveCommand => {
    // 后端契约：speed 范围为 0.0–1.0，duration_ms 范围为 0–10000
    const rawSpeed = typeof args?.speed === 'number' ? args.speed : 0.5
    const rawDuration = typeof args?.duration_ms === 'number' ? args.duration_ms : 300
    const speed = Math.max(0, Math.min(1, rawSpeed))
    const duration_ms = Math.max(0, Math.min(10000, rawDuration))
    return { command: cmd, speed, duration_ms }
  }

  const parsePluginCall = (raw: any): PluginCall | null => {
    try {
      let obj: any = raw
      if (typeof raw === 'string') {
        // 先去除不可见控制符与锚点标签
        const sanitized = removeAnchorTags(raw.replace(/[\u0000-\u001F]/g, ''))
        // 尝试直接解析
        try {
          obj = JSON.parse(sanitized)
        } catch {
          // 再尝试从文本中提取第一个 JSON 子串
          obj = extractFirstJsonObject(sanitized)
          if (!obj) return null
        }
      }
      if (!obj || typeof obj !== 'object') return null
      const plugin_name: string = obj.plugin_name || obj.api_name || obj.name || obj.plugin
      if (!plugin_name || !ALLOWED_PLUGIN_NAMES.has(String(plugin_name))) return null
      const call: PluginCall = {
        plugin_name: String(plugin_name),
        arguments: obj.arguments && typeof obj.arguments === 'object' ? obj.arguments : {},
        plugin_icon: typeof obj.plugin_icon === 'string' ? obj.plugin_icon : undefined,
      }
      return call
    } catch {
      return null
    }
  }

  const executePluginCall = async (conversationId: string | undefined, call: PluginCall) => {
    if (!conversationId) return
    const key = buildCallKey(call)
    const executedKeys = executedToolsRef.current[conversationId] || []
    if (executedKeys.includes(key)) {
      appendAssistantMessage(conversationId, `⚠️ 已检测为重复调用，已忽略：${call.plugin_name} | ${stableStringify(call.arguments ?? {})}`)
      return
    }

    const ts = new Date().toLocaleString()
    try {
      if (call.plugin_name === 'robot_ctrl') {
        const cmdRaw = call.arguments?.cmd
        const normalized = normalizeCmd(String(cmdRaw || 'stop'))
        if (normalized === 'stop') {
          await api.stop()
          appendAssistantMessage(conversationId, `插件执行完成（机器人控制）：已停止。时间：${ts}`)
        } else if (normalized === 'estop') {
          await api.estop()
          appendAssistantMessage(conversationId, `插件执行完成（机器人控制）：紧急停止。时间：${ts}`)
        } else {
          const payload = cmdToMoveCommand(normalized as MoveCommand['command'], call.arguments)
          await api.move(payload)
          appendAssistantMessage(
            conversationId,
            `插件执行完成（机器人控制）：${payload.command}，速度=${payload.speed}，时长=${payload.duration_ms}ms。时间：${ts}`,
          )
        }
      } else if (call.plugin_name === 'take_photo_for_recognition') {
        const res = await api.cameraSnapshot({})
        const data = res.data as CameraSnapshotData | undefined
        if (data && data.snapshot) {
          const s = data.snapshot
          const base64 = s.base64
          if (base64) {
            // 清理可能存在的空白符，确保 data URI 正确
            const base64Clean = String(base64).replace(/\s+/g, '')
            const info = `插件执行完成（拍照识别）：尺寸=${s.width}x${s.height}，时间戳=${s.timestamp}`
            // 在助手消息中以内嵌图片（Markdown）显示 base64 内容
            appendAssistantMessage(
              conversationId,
              `${info}\n\n![拍照结果](data:image/jpeg;base64,${base64Clean})`,
            )
          } else {
            // 若后端未返回 base64，退回到文本信息（保留路径用于排障）
            appendAssistantMessage(
              conversationId,
              `插件执行完成（拍照识别）：已拍照，但无图像数据。路径=${s.saved_path}，尺寸=${s.width}x${s.height}，时间戳=${s.timestamp}`,
            )
          }
        } else {
          appendAssistantMessage(conversationId, `插件执行完成（拍照识别）：已拍照，但无详细数据。时间：${ts}`)
        }
      }
      // 标记此调用已执行
      executedToolsRef.current[conversationId] = [...executedKeys, key]
    } catch (e: any) {
      const msg = e?.message || '未知错误'
      appendAssistantMessage(conversationId, `插件执行失败（${call.plugin_name}）：${msg}。时间：${ts}`)
    }
  }

  const copyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch (e) {
      console.error('复制失败：', e)
    }
  }

  // 创建新会话
  const createConversation = async (initialMessage?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const messages: ConversationMessage[] = initialMessage
        ? [{ role: 'user', content: initialMessage }]
        : []

      const request: ConversationCreateRequest = { messages }
      const response = await api.createConversation(request)

      const newConversation: ConversationItem = {
        id: response.data?.id || '',
        messages,
        createdAt: new Date(),
      }

      setConversations(prev => [newConversation, ...prev])
      setSelectedConversation(response.data?.id || '')
      setNewMessage('')
    } catch (err) {
      setError(`创建会话失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 删除会话
  const deleteConversation = async (conversationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await api.deleteConversation(conversationId)
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))

      if (selectedConversation === conversationId) {
        setSelectedConversation(null)
      }
    } catch (err) {
      setError(`删除会话失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取会话详情
  const getConversation = async (conversationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.getConversation(conversationId)
      console.log('会话详情:', response)
    } catch (err) {
      setError(`获取会话失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用插件流式端点进行 AI 对话
  const streamChatWithPlugins = async (message: string, conversationId?: string) => {
    const entryTs = new Date().toISOString()
    console.log(`[${entryTs}] streamChatWithPlugins entry`, { message, conversationId, botId })
    if (!botId.trim()) {
      setError('请先设置Bot ID')
      return
    }

    setIsStreaming(true)
    setError(null)

    try {
      // 每次新消息发送时清空临时队列，避免上次遗留
      pendingBeforeConvRef.current = []
      const request: StreamChatRequest = {
        text: message,
        bot_id: botId,
        conversation_id: conversationId,
      }

      let currentConversationId = conversationId
      let assistantMessage = ''

      for await (const event of api.streamChatUnified(request, { usePlugins: true })) {
        if (event.type === 'conversation_id' && event.content) {
          currentConversationId = event.content
          // 每次新一轮会话ID到达时重置该会话的已执行集合（仅对当前轮去重）
          if (currentConversationId) {
            executedToolsRef.current[currentConversationId] = []
          }
          if (!conversationId) {
            const newConv: ConversationItem = {
              id: currentConversationId,
              messages: [{ role: 'user', content: message }],
              createdAt: new Date(),
            }
            setConversations(prev => [newConv, ...prev])
            setSelectedConversation(currentConversationId)
          }
          // 将在 conversation_id 到达前暂存的插件调用搬迁到该会话队列
          const pre = pendingBeforeConvRef.current
          if (pre.length > 0 && currentConversationId) {
            const list = pendingToolsRef.current[currentConversationId] || []
            pendingToolsRef.current[currentConversationId] = [...list, ...pre]
            pendingBeforeConvRef.current = []
          }
        } else if (event.type === 'content' && event.content) {
          // 解析并暂存插件调用，等待 completed 后执行
          const maybeCall = parsePluginCall(event.content)
          if (maybeCall) {
            const ts = new Date().toISOString()
            console.log(`[${ts}] Plugin call queued`, maybeCall)
            if (currentConversationId) {
              const list = pendingToolsRef.current[currentConversationId] || []
              pendingToolsRef.current[currentConversationId] = [...list, maybeCall]
            } else {
              // 尚无会话 ID，先暂存
              pendingBeforeConvRef.current = [...pendingBeforeConvRef.current, maybeCall]
            }
          }
          assistantMessage += event.content
          setConversations(prev => prev.map(conv => {
            if (conv.id !== currentConversationId) return conv
            const messages = [...conv.messages]
            const lastIndex = messages.length - 1
            const hasAssistantLast = messages[lastIndex]?.role === 'assistant'
            if (!hasAssistantLast) {
              messages.push({ role: 'assistant', content: assistantMessage })
            } else {
              messages[lastIndex] = { role: 'assistant', content: assistantMessage }
            }
            return { ...conv, messages }
          }))
        } else if (event.type === 'completed' && event.content) {
          const finalText = event.content
          // 在最终文本中也尝试解析可能的插件 JSON
          const callFromFinal = parsePluginCall(finalText)
          if (callFromFinal) {
            if (currentConversationId) {
              const list = pendingToolsRef.current[currentConversationId] || []
              pendingToolsRef.current[currentConversationId] = [...list, callFromFinal]
            } else {
              pendingBeforeConvRef.current = [...pendingBeforeConvRef.current, callFromFinal]
            }
          }
          setConversations(prev => prev.map(conv => {
            if (conv.id !== currentConversationId) return conv
            const messages = [...conv.messages]
            const lastIndex = messages.length - 1
            const hasAssistantLast = messages[lastIndex]?.role === 'assistant'
            if (hasAssistantLast) {
              messages[lastIndex] = { role: 'assistant', content: finalText }
            } else {
              messages.push({ role: 'assistant', content: finalText })
            }
            return { ...conv, messages }
          }))

          // 执行队列中的插件调用（去重）
          if (currentConversationId) {
            const queued = pendingToolsRef.current[currentConversationId] || []
            if (queued.length > 0) {
              const unique: PluginCall[] = []
              const seen = new Set<string>()
              for (const c of queued) {
                const k = buildCallKey(c)
                if (!seen.has(k)) {
                  seen.add(k)
                  unique.push(c)
                }
              }
              for (const call of unique) {
                // eslint-disable-next-line no-await-in-loop
                await executePluginCall(currentConversationId, call)
              }
              // 清空队列
              pendingToolsRef.current[currentConversationId] = []
            }
          }
          break
        } else if (event.type === 'error') {
          const errorMsg = `AI对话错误: ${event.content || '未知错误'}`
          const errorCode = event.error_code ? ` (${event.error_code})` : ''
          setError(errorMsg + errorCode)
          break
        }
      }
    } catch (err) {
      const errorMsg = `流式对话失败: ${err instanceof Error ? err.message : '未知错误'}`
      setError(errorMsg)
    } finally {
      setIsStreaming(false)
    }
  }

  // 发送消息并获取AI回复
  const sendMessageWithAI = async () => {
    if (!newMessage.trim()) return

    const message = newMessage.trim()
    setNewMessage('')

    if (selectedConversation) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, messages: [...conv.messages, { role: 'user', content: message }] }
            : conv,
        ),
      )
      await streamChatWithPlugins(message, selectedConversation)
    } else {
      await streamChatWithPlugins(message)
    }
  }

  const createAndSendMessage = async () => {
    if (!newMessage.trim()) return
    await streamChatWithPlugins(newMessage.trim())
  }

  const selectedConv = conversations.find(conv => conv.id === selectedConversation)

  // 仅在助手消息到达且用户未上滑时自动滚动到底部
  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const conv = conversations.find(c => c.id === selectedConversation)
    const lastRole = conv?.messages?.[conv?.messages.length - 1]?.role
    if (lastRole === 'assistant' && atBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [selectedConversation, conversations, atBottom])

  const onMessagesScroll = () => {
    const el = messagesContainerRef.current
    if (!el) return
    const epsilon = 40
    const isNearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < epsilon
    setAtBottom(isNearBottom)
  }

  return (
    <div className="coze-conversation-plugins-panel">
      <div className="panel-header">
        <h2>Coze 会话（插件模式）</h2>
        <div className="header-controls" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="bot-id-input">
            <label htmlFor="botId">Bot ID:</label>
            <input
              id="botId"
              type="text"
              value={botId}
              onChange={(e) => setBotId(e.target.value)}
              placeholder="输入Coze Bot ID"
              disabled={isLoading || isStreaming}
            />
          </div>
          <button onClick={() => createConversation()} disabled={isLoading || isStreaming} className="btn btn-primary">
            新建会话
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="conversations-container" style={{ display: 'flex', gap: 16 }}>
        {/* 会话列表 */}
        <div className="conversations-list" style={{ width: 280 }}>
          <h3>会话列表</h3>
          {conversations.length === 0 ? (
            <p className="empty-state">暂无会话</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation === conv.id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(conv.id)}
                style={{ border: '1px solid #ddd', padding: 8, borderRadius: 6, marginBottom: 8, cursor: 'pointer' }}
              >
                <div className="conversation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="conversation-id">ID: {conv.id.slice(0, 8)}...</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    disabled={isLoading}
                    className="btn btn-danger btn-sm"
                  >
                    删除
                  </button>
                </div>
                <div className="conversation-info" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <small>创建时间: {conv.createdAt.toLocaleString()}</small>
                  <small>消息数: {conv.messages.length}</small>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 会话详情 */}
        <div className="conversation-details" style={{ flex: 1 }}>
          {selectedConv ? (
            <>
              <div className="conversation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>会话详情</h3>
                <button onClick={() => getConversation(selectedConv.id)} disabled={isLoading} className="btn btn-secondary btn-sm">
                  刷新
                </button>
              </div>

              <div className="messages-container" ref={messagesContainerRef} onScroll={onMessagesScroll} style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, maxHeight: '50vh', overflowY: 'auto' }}>
                {selectedConv.messages.length === 0 ? (
                  <p className="empty-state">暂无消息</p>
                ) : (
                  selectedConv.messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`} style={{ marginBottom: 8 }}>
                      <div className="message-role" style={{ fontWeight: 600 }}>{msg.role === 'user' ? '用户' : '助手'}</div>
                      {msg.role === 'assistant' && (
                        <button
                          className={`copy-btn ${copiedIndex === index ? 'copied' : ''}`}
                          onClick={() => copyMessage(String(msg.content ?? ''), index)}
                          aria-label="复制助手消息"
                          title={copiedIndex === index ? '已复制' : '复制'}
                        >
                          {copiedIndex === index ? '已复制' : '复制'}
                        </button>
                      )}
                      <div className="message-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          urlTransform={(url: string, key: 'href' | 'src') => {
                            if (!url) return url
                            // 允许 data:image/* 的本地内联图片，以及 http/https
                            if (url.startsWith('data:image/')) return url
                            if (url.startsWith('http://') || url.startsWith('https://')) return url
                            // 其它协议一律移除以保证安全
                            return ''
                          }}
                        >
                          {String(msg.content ?? '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="message-input" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入消息..."
                  disabled={isLoading || isStreaming}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessageWithAI()
                    }
                  }}
                  style={{ flex: 1, padding: '6px 10px' }}
                />
                <button onClick={sendMessageWithAI} disabled={isLoading || isStreaming || !newMessage.trim()} className="btn btn-primary">
                  {isStreaming ? '发送中...' : '发送'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>请选择一个会话或创建新会话</p>
              <div className="quick-start" style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入消息创建新会话..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      createAndSendMessage()
                    }
                  }}
                  disabled={isLoading || isStreaming}
                  style={{ flex: 1, padding: '6px 10px' }}
                />
                <button
                  onClick={createAndSendMessage}
                  disabled={isLoading || isStreaming || !newMessage.trim() || !botId.trim()}
                  className="btn btn-primary"
                >
                  {isStreaming ? '创建中...' : '创建并发送'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">加载中...</div>
        </div>
      )}
    </div>
  )
}