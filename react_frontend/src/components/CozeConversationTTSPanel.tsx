import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, type ConversationCreateRequest, type ConversationMessage, type StreamChatRequest, type TTSResult } from '../lib/api'

interface ConversationItem {
  id: string
  messages: ConversationMessage[]
  createdAt: Date
}

export default function CozeConversationTTSPanel() {
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

  const copyMessage = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch (e) {
      console.error('复制失败：', e)
    }
  }

  const [playOnBackend, setPlayOnBackend] = useState<boolean>(true)
  const [filenamePrefix, setFilenamePrefix] = useState<string>('coze_tts_playback')
  const [ttsStatus, setTtsStatus] = useState<string>('')
  const [ttsResult, setTtsResult] = useState<TTSResult | null>(null)

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

  // 触发 TTS 播放
  const playTTS = async (text: string) => {
    if (!text || !text.trim()) return
    setTtsStatus('正在合成并播放...')
    setTtsResult(null)
    try {
      const res = await api.tts({
        input_text: text,
        filename_prefix: filenamePrefix || undefined,
        play: playOnBackend,
      })
      setTtsResult(res.data || null)
      setTtsStatus(playOnBackend ? '已在后端播放生成的音频' : '已生成音频文件（未播放）')
    } catch (err) {
      const msg = `TTS 合成失败: ${err instanceof Error ? err.message : '未知错误'}`
      setError(msg)
      setTtsStatus('TTS 失败')
    }
  }

  // 流式AI对话，完成后调用TTS播放
  const streamChatWithBot = async (message: string, conversationId?: string) => {
    if (!botId.trim()) {
      setError('请先设置Bot ID')
      return
    }

    setIsStreaming(true)
    setError(null)
    setTtsStatus('')
    setTtsResult(null)

    try {
      const request: StreamChatRequest = {
        text: message,
        bot_id: botId,
        conversation_id: conversationId,
      }

      let currentConversationId = conversationId
      let assistantMessage = ''
      let finalText = ''

      for await (const event of api.streamChatUnified(request, { usePlugins: false })) {
        if (event.type === 'conversation_id' && event.content) {
          currentConversationId = event.content
          if (!conversationId) {
            const newConv: ConversationItem = {
              id: currentConversationId,
              messages: [{ role: 'user', content: message }],
              createdAt: new Date(),
            }
            setConversations(prev => [newConv, ...prev])
            setSelectedConversation(currentConversationId)
          }
        } else if (event.type === 'content' && event.content) {
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
          finalText = event.content
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
          break
        } else if (event.type === 'error') {
          const errorMsg = `AI对话错误: ${event.content || '未知错误'}`
          const errorCode = event.error_code ? ` (${event.error_code})` : ''
          setError(errorMsg + errorCode)
          break
        }
      }

      // 在最终文本完成后调用 TTS 播放
      if (finalText && finalText.trim()) {
        await playTTS(finalText)
      }
    } catch (err) {
      const errorMsg = `流式对话失败: ${err instanceof Error ? err.message : '未知错误'}`
      setError(errorMsg)
    } finally {
      setIsStreaming(false)
    }
  }

  // 发送消息并获取AI回复（完成后自动TTS）
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
      await streamChatWithBot(message, selectedConversation)
    } else {
      await streamChatWithBot(message)
    }
  }

  const createAndSendMessage = async () => {
    if (!newMessage.trim()) return
    await streamChatWithBot(newMessage.trim())
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
    <div className="coze-conversation-tts-panel">
      <div className="panel-header">
        <h2>Coze 会话 + TTS 播放</h2>
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label>
              <input
                type="checkbox"
                checked={playOnBackend}
                onChange={(e) => setPlayOnBackend(e.target.checked)}
                disabled={isStreaming}
              />
              收到完整消息后自动进行 TTS 并在后端播放
            </label>
            <input
              type="text"
              value={filenamePrefix}
              onChange={(e) => setFilenamePrefix(e.target.value)}
              placeholder="文件名前缀（可选）"
              disabled={isStreaming}
              style={{ padding: '4px 8px', minWidth: 180 }}
            />
          </div>
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
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

              {/* TTS 状态显示 */}
              <div className="tts-status" style={{ marginTop: 16 }}>
                <h4>TTS 状态</h4>
                <div>{ttsStatus}</div>
                {ttsResult && (
                  <div style={{ marginTop: 8 }}>
                    <div>音频路径: {ttsResult.tts_audio_path}</div>
                    <div>Voice ID: {ttsResult.voice_id}</div>
                  </div>
                )}
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