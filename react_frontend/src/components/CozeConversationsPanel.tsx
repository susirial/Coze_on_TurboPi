import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api, type ConversationCreateRequest, type ConversationMessage, type StreamChatRequest } from '../lib/api'

interface ConversationItem {
  id: string
  messages: ConversationMessage[]
  createdAt: Date
}

export default function CozeConversationsPanel() {
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
        createdAt: new Date()
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

  // 发送消息到现有会话
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return
    
    const message: ConversationMessage = {
      role: 'user',
      content: newMessage.trim()
    }
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation 
          ? { ...conv, messages: [...conv.messages, message] }
          : conv
      )
    )
    
    setNewMessage('')
  }

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

  // 流式AI对话
  const streamChatWithBot = async (message: string, conversationId?: string) => {
    console.log('🤖 Starting stream chat with bot:', { message, conversationId, botId })
    
    if (!botId.trim()) {
      const errorMsg = '请先设置Bot ID'
      console.error('❌ Bot ID validation failed:', errorMsg)
      setError(errorMsg)
      return
    }

    setIsStreaming(true)
    setError(null)

    try {
      const request: StreamChatRequest = {
        text: message,
        bot_id: botId,
        conversation_id: conversationId
      }

      console.log('📤 Sending stream request:', request)
      let currentConversationId = conversationId
      let assistantMessage = ''
      let isFirstContent = true

      for await (const event of api.streamChatUnified(request, { usePlugins: false })) {
        console.log('📥 Processing stream event:', event.type, event.trace_id)
        
        if (event.type === 'conversation_id' && event.content) {
          currentConversationId = event.content
          console.log('🆔 Conversation ID received:', currentConversationId, 'type:', typeof currentConversationId)
          
          // 如果是新会话，添加到会话列表
          if (!conversationId) {
            const newConversation: ConversationItem = {
              id: currentConversationId,
              messages: [{ role: 'user', content: message }],
              createdAt: new Date()
            }
            console.log('➕ Adding new conversation to list:', newConversation)
            setConversations(prev => {
              console.log('➕ Previous conversations:', prev.length)
              const updated = [newConversation, ...prev]
              console.log('➕ Updated conversations:', updated.length, updated.map(c => c.id))
              return updated
            })
            setSelectedConversation(currentConversationId)
            console.log('🎯 Selected conversation set to:', currentConversationId)
          }
        } else if (event.type === 'content' && event.content) {
          assistantMessage += event.content
          console.log('💬 Content received, total length:', assistantMessage.length)
          console.log('💬 Current conversation ID:', currentConversationId)
          console.log('💬 Assistant message so far:', assistantMessage)
          
          // 实时更新助手消息（无论是否存在，都保证有助手消息）
          setConversations(prev => {
            console.log('💬 Updating conversations, current conversations:', prev.length)
            console.log('💬 Looking for conversation ID:', currentConversationId)
            console.log('💬 Available conversation IDs:', prev.map(c => c.id))
            return prev.map(conv => {
              const match = conv.id === currentConversationId
              console.log('💬 Checking conversation:', conv.id, 'vs', currentConversationId, 'match:', match)
              if (!match) return conv

              console.log('💬 Found matching conversation:', conv.id)
              const messages = [...conv.messages]
              const lastIndex = messages.length - 1
              const hasAssistantLast = messages[lastIndex]?.role === 'assistant'

              if (!hasAssistantLast) {
                console.log('🆕 No assistant message at end. Creating new assistant message.')
                messages.push({ role: 'assistant', content: assistantMessage })
              } else {
                console.log('🔄 Updating existing assistant message at index', lastIndex)
                messages[lastIndex] = { role: 'assistant', content: assistantMessage }
              }

              console.log('💬 Updated messages:', messages.map(m => `${m.role}: ${String(m.content).slice(0,30)}...`))
              return { ...conv, messages }
            })
          })
        } else if (event.type === 'completed' && event.content) {
          console.log('✅ Stream completed, final message length:', event.content.length)
          // 最终完成，确保消息完整
          setConversations(prev => {
            return prev.map(conv => {
              if (conv.id !== currentConversationId) return conv
              const messages = [...conv.messages]
              const lastIndex = messages.length - 1
              const hasAssistantLast = messages[lastIndex]?.role === 'assistant'
              if (hasAssistantLast) {
                console.log('🔚 Finalizing assistant message at index', lastIndex)
                messages[lastIndex] = { role: 'assistant', content: event.content || '' }
              } else {
                console.log('🆕 No assistant message found on complete. Pushing final message.')
                messages.push({ role: 'assistant', content: event.content || '' })
              }
              console.log('🏁 Final messages:', messages.map(m => `${m.role}: ${String(m.content).slice(0,30)}...`))
              return { ...conv, messages }
            })
          })
          break
        } else if (event.type === 'error') {
          const errorMsg = `AI对话错误: ${event.content || '未知错误'}`
          const errorCode = event.error_code ? ` (${event.error_code})` : ''
          console.error('❌ Stream error:', errorMsg, errorCode, event.trace_id)
          setError(errorMsg + errorCode)
          break
        }
      }
      
      console.log('🏁 Stream chat completed successfully')
    } catch (err) {
      const errorMsg = `流式对话失败: ${err instanceof Error ? err.message : '未知错误'}`
      console.error('❌ Stream chat exception:', err)
      setError(errorMsg)
    } finally {
      console.log('🔄 Resetting streaming state')
      setIsStreaming(false)
    }
  }

  // 发送消息并获取AI回复
  const sendMessageWithAI = async () => {
    if (!newMessage.trim()) return
    
    const message = newMessage.trim()
    setNewMessage('')

    if (selectedConversation) {
      // 添加用户消息到现有会话
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation 
            ? { ...conv, messages: [...conv.messages, { role: 'user', content: message }] }
            : conv
        )
      )
      // 流式获取AI回复
      await streamChatWithBot(message, selectedConversation)
    } else {
      // 创建新会话并获取AI回复
      await streamChatWithBot(message)
    }
  }

  // 创建新会话并发送消息
  const createAndSendMessage = async () => {
    if (!newMessage.trim()) return
    await streamChatWithBot(newMessage.trim())
  }
// 获取选中的会话
  const selectedConv = conversations.find(conv => conv.id === selectedConversation)
  console.log('🎯 Selected conversation:', selectedConversation, 'Found:', !!selectedConv)
  console.log('🎯 Selected conv messages:', selectedConv?.messages?.length || 0)
  if (selectedConv) {
    console.log('🎯 Messages in selected conv:', selectedConv.messages.map(m => `${m.role}: ${m.content?.substring(0, 30)}...`))
  }

  return (
    <div className="coze-conversations-panel">
      <div className="panel-header">
        <h2>Coze 会话管理</h2>
        <div className="header-controls">
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
          <button 
            onClick={() => createConversation()} 
            disabled={isLoading || isStreaming}
            className="btn btn-primary"
          >
            新建会话
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="conversations-container">
        {/* 会话列表 */}
        <div className="conversations-list">
          <h3>会话列表</h3>
          {conversations.length === 0 ? (
            <p className="empty-state">暂无会话</p>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id}
                className={`conversation-item ${selectedConversation === conv.id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(conv.id)}
              >
                <div className="conversation-header">
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
                <div className="conversation-info">
                  <small>创建时间: {conv.createdAt.toLocaleString()}</small>
                  <small>消息数: {conv.messages.length}</small>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 会话详情 */}
        <div className="conversation-details">
          {selectedConv ? (
            <>
              <div className="conversation-header">
                <h3>会话详情</h3>
                <button 
                  onClick={() => getConversation(selectedConv.id)}
                  disabled={isLoading}
                  className="btn btn-secondary btn-sm"
                >
                  刷新
                </button>
              </div>
              
              <div className="messages-container" ref={messagesContainerRef} onScroll={onMessagesScroll}>
                {selectedConv.messages.length === 0 ? (
                  <p className="empty-state">暂无消息</p>
                ) : (
                  selectedConv.messages.map((msg, index) => {
                    console.log('🎨 Rendering message:', index, msg.role, msg.content?.substring(0, 50) + '...')
                    return (
                      <div key={index} className={`message ${msg.role}`}>
                        <div className="message-role">{msg.role === 'user' ? '用户' : '助手'}</div>
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
                    )
                  })
                )}
              </div>

              <div className="message-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入消息..."
                  disabled={isLoading || isStreaming}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessageWithAI()
                    }
                  }}
                />
                <button 
                  onClick={sendMessageWithAI} 
                  disabled={isLoading || isStreaming || !newMessage.trim()}
                  className="btn btn-primary"
                >
                  {isStreaming ? '发送中...' : '发送'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>请选择一个会话或创建新会话</p>
              <div className="quick-start">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="输入消息创建新会话..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      createAndSendMessage()
                    }
                  }}
                  disabled={isLoading || isStreaming}
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