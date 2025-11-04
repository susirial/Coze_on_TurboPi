import React, { useState } from 'react'
import './CozeImageChatPanel.scss'
import { api, type StreamChatEvent } from '../lib/api'

export default function CozeImageChatPanel() {
  const [botId, setBotId] = useState('')
  const [userId, setUserId] = useState('')
  const [conversationId, setConversationId] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [streaming, setStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamConversationId, setStreamConversationId] = useState('')
  const [streamChunks, setStreamChunks] = useState<string[]>([])
  const [streamCompleted, setStreamCompleted] = useState('')

  async function startImageChatStream() {
    setStreamError(null)
    setStreaming(true)
    setStreamConversationId('')
    setStreamChunks([])
    setStreamCompleted('')

    try {
      if (!botId.trim()) {
        setStreamError('请先设置 Bot ID')
        return
      }
      if (!text.trim()) {
        setStreamError('请输入用户指令文本')
        return
      }

      const payload = {
        file: file || undefined,
        text: text,
        bot_id: botId,
        user_id: userId || undefined,
        conversation_id: conversationId || undefined,
      }

      for await (const evt of api.imageChatStream(payload)) {
        if (evt.type === 'conversation_id' && evt.content) {
          setStreamConversationId(evt.content)
          if (!conversationId) setConversationId(evt.content)
        } else if (evt.type === 'content' && evt.content) {
          setStreamChunks(prev => [...prev, evt.content!])
        } else if (evt.type === 'completed' && evt.content) {
          setStreamCompleted(evt.content)
        } else if (evt.type === 'error') {
          setStreamError(evt.content || '流式返回错误')
        } else if (evt.type === 'done') {
          // end of stream
        }
      }
    } catch (e: any) {
      setStreamError(e?.message || '启动流式返回失败')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="coze-image-chat-panel">
      <h2 className="image-chat-title">Coze 图片对话（流式）</h2>
      <p className="image-chat-desc">上传可选图片 + 文本指令，后端先上传图片到 Coze，再进行图片对话并流式返回文本。</p>

      <div className="image-chat-form">
        <div className="image-chat-row">
          <label className="image-chat-label">Bot ID</label>
          <input
            type="text"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            placeholder="输入 Coze Bot ID"
            disabled={streaming}
            className="image-chat-input"
          />
        </div>

        <div className="image-chat-row">
          <label className="image-chat-label">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="可选"
            disabled={streaming}
            className="image-chat-input"
          />
        </div>

        <div className="image-chat-row">
          <label className="image-chat-label">会话ID</label>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="留空表示新建会话"
            disabled={streaming}
            className="image-chat-input"
          />
        </div>

        <div className="image-chat-row">
          <label className="image-chat-label">图片文件</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={streaming}
          />
          {file && (
            <span className="image-chat-fileinfo">{file.name}（{file.size}字节）</span>
          )}
        </div>

        <div className="image-chat-row">
          <label className="image-chat-label">指令文本</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例如：请识别图片中的文字"
            disabled={streaming}
            className="image-chat-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                startImageChatStream()
              }
            }}
          />
          <button
            onClick={startImageChatStream}
            disabled={streaming || !botId.trim() || !text.trim()}
            className="btn btn-primary"
          >
            {streaming ? '发送中...' : '开始图片对话'}
          </button>
        </div>
      </div>

      <div className="image-chat-results">
        {streamConversationId && (
          <div className="image-chat-result-row">
            <strong>会话 ID：</strong>
            <code className="image-chat-code">{streamConversationId}</code>
          </div>
        )}
        {streamChunks.length > 0 && (
          <div className="image-chat-result-row">
            <strong>内容片段：</strong>
            <div className="image-chat-text">
              {streamChunks.join('')}
            </div>
          </div>
        )}
        {streamCompleted && (
          <div className="image-chat-result-row">
            <strong>完整消息：</strong>
            <div className="image-chat-text">{streamCompleted}</div>
          </div>
        )}
        {streamError && (
          <div className="alert error image-chat-error">{streamError}</div>
        )}
      </div>
    </div>
  )
}