import './App.css'
import { StatusCard } from './components/StatusCard'
import MJServiceHub from './components/MJServiceHub'
import { ControlPanel } from './components/ControlPanel'
import { ConfigPanel } from './components/ConfigPanel'
import CozeConversationsPanel from './components/CozeConversationsPanel'
import CozeConversationTTSPanel from './components/CozeConversationTTSPanel'
import CozeConversationPluginsPanel from './components/CozeConversationPluginsPanel'
import CozeAudioPanel from './components/CozeAudioPanel'
import CozeAudioChatPanel from './components/CozeAudioChatPanel'
import CozeTTSPanel from './components/CozeTTSPanel'
import CozeBotsPanel from './components/CozeBotsPanel'
import CozeBotCreateTest from './components/CozeBotCreateTest'
import CozeBotRetrievePanel from './components/CozeBotRetrievePanel'
import CozeFileUploadPanel from './components/CozeFileUploadPanel'
import CozeImageChatPanel from './components/CozeImageChatPanel'
import CozeNavigationDialogPanel from './components/CozeNavigationDialogPanel'
import CozeTranscriptionsPanel from './components/CozeTranscriptionsPanel'
import CozeVoiceDialogPanel from './components/CozeVoiceDialogPanel'
import ApiDocsPanel from './components/ApiDocsPanel'
import { useEffect, useState } from 'react'
import { getBaseUrl, setBaseUrl } from './lib/api'
import { discoverBackend } from './lib/discovery'
import CameraSnapshotPanel from './components/CameraSnapshotPanel'
import BuzzerPanel from './components/BuzzerPanel'

function App() {
  const [tab, setTab] = useState<'service' | 'control' | 'config' | 'coze' | 'audio' | 'audio_chat' | 'tts' | 'coze_tts' | 'coze_plugins' | 'coze_bots' | 'coze_bot_create' | 'coze_bot_retrieve' | 'coze_upload' | 'coze_image' | 'coze_nav_dialog' | 'coze_transcriptions' | 'coze_voice_dialog' | 'camera' | 'buzzer' | 'api_docs'>('service')
  const [currentUrl, setCurrentUrl] = useState<string>('')
  const [inputUrl, setInputUrl] = useState<string>('')
  const [discovering, setDiscovering] = useState<boolean>(false)

  useEffect(() => {
    const initial = getBaseUrl()
    setCurrentUrl(initial)
    setInputUrl(initial)
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1>TurboPi 面板</h1>
        <nav className="tabs">
          <button
            className={tab === 'service' ? 'tab active' : 'tab'}
            onClick={() => setTab('service')}
          >
            服务查询
          </button>
          <button
            className={tab === 'control' ? 'tab active' : 'tab'}
            onClick={() => setTab('control')}
          >
            方向控制
          </button>
          <button
            className={tab === 'config' ? 'tab active' : 'tab'}
            onClick={() => setTab('config')}
          >
            配置管理
          </button>
          <button
            className={tab === 'coze' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze')}
          >
            Coze 会话
          </button>
          <button
            className={tab === 'audio' ? 'tab active' : 'tab'}
            onClick={() => setTab('audio')}
          >
            Coze 音色
          </button>
          <button
            className={tab === 'audio_chat' ? 'tab active' : 'tab'}
            onClick={() => setTab('audio_chat')}
          >
            音频聊天测试
          </button>
          <button
            className={tab === 'coze_transcriptions' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_transcriptions')}
          >
            语音识别
          </button>
          <button
            className={tab === 'coze_voice_dialog' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_voice_dialog')}
          >
            对讲机模式
          </button>
          <button
            className={tab === 'tts' ? 'tab active' : 'tab'}
            onClick={() => setTab('tts')}
          >
            TTS 测试
          </button>
          <button
            className={tab === 'coze_tts' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_tts')}
          >
            会话+TTS 播放
          </button>
          <button
            className={tab === 'coze_plugins' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_plugins')}
          >
            会话(插件)
          </button>
          <button
            className={tab === 'coze_bots' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_bots')}
          >
            BOT 列表
          </button>
          <button
            className={tab === 'coze_bot_create' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_bot_create')}
          >
            BOT 创建
          </button>
          <button
            className={tab === 'coze_bot_retrieve' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_bot_retrieve')}
          >
            BOT 查询
          </button>
          <button
            className={tab === 'camera' ? 'tab active' : 'tab'}
            onClick={() => setTab('camera')}
          >
            相机快照
          </button>
          <button
            className={tab === 'buzzer' ? 'tab active' : 'tab'}
            onClick={() => setTab('buzzer')}
          >
            蜂鸣器测试
          </button>
          <button
            className={tab === 'coze_upload' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_upload')}
          >
            Coze 文件上传
          </button>
          <button
            className={tab === 'coze_image' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_image')}
          >
            Coze 图片对话
          </button>
          <button
            className={tab === 'coze_nav_dialog' ? 'tab active' : 'tab'}
            onClick={() => setTab('coze_nav_dialog')}
          >
            导航对话
          </button>
          <button
            className={tab === 'api_docs' ? 'tab active' : 'tab'}
            onClick={() => setTab('api_docs')}
          >
            API 说明文档
          </button>
        </nav>
      </header>

        <main className="main-content">
          {tab === 'service' && <MJServiceHub />}
          {tab === 'control' && <ControlPanel />}
          {tab === 'config' && <ConfigPanel />}
          {tab === 'coze' && <CozeConversationsPanel />}
          {tab === 'audio' && <CozeAudioPanel />}
          {tab === 'audio_chat' && <CozeAudioChatPanel />}
          {tab === 'tts' && <CozeTTSPanel />}
          {tab === 'coze_tts' && <CozeConversationTTSPanel />}
          {tab === 'coze_plugins' && <CozeConversationPluginsPanel />}
          {tab === 'coze_bots' && <CozeBotsPanel />}
          {tab === 'coze_bot_create' && <CozeBotCreateTest />}
          {tab === 'coze_bot_retrieve' && <CozeBotRetrievePanel />}
          {tab === 'coze_upload' && <CozeFileUploadPanel />}
          {tab === 'coze_image' && <CozeImageChatPanel />}
          {tab === 'coze_nav_dialog' && <CozeNavigationDialogPanel />}
          {tab === 'coze_transcriptions' && <CozeTranscriptionsPanel />}
          {tab === 'coze_voice_dialog' && <CozeVoiceDialogPanel />}
          {tab === 'camera' && <CameraSnapshotPanel />}
          {tab === 'buzzer' && <BuzzerPanel />}
          {tab === 'api_docs' && <ApiDocsPanel />}
        </main>

      <footer className="footer">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <small>当前后端：{currentUrl || '未设置'}</small>
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://turbopi.local:8000"
            style={{ padding: '4px 8px', minWidth: 260 }}
          />
          <button
            onClick={() => {
              if (!inputUrl) return
              setBaseUrl(inputUrl)
              setCurrentUrl(inputUrl)
            }}
          >
            保存地址
          </button>
          <button
            disabled={discovering}
            onClick={async () => {
              setDiscovering(true)
              const found = await discoverBackend()
              setDiscovering(false)
              if (found) {
                setBaseUrl(found)
                setCurrentUrl(found)
                setInputUrl(found)
              } else {
                alert('未在局域网内发现 Turbopi 后端，请手动填写地址或确认设备在线。')
              }
            }}
          >
            {discovering ? '正在发现...' : '自动发现'}
          </button>
          <small style={{ marginLeft: 'auto' }}>© 茉卷 2025</small>
        </div>
      </footer>
    </div>
  )
}

export default App
