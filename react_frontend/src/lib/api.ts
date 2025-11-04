export type SuccessResponse<T = any> = {
  code: string
  message: string
  trace_id: string
  mode: string
  data?: T
}

export type HealthData = {
  status: string
  runtime_mode: string
  uptime_seconds: number
  runtime_initialized: boolean
  provider_available: boolean
  timestamp: string
}

export type SystemStatus = {
  runtime_mode: string
  service_name: string
  port: number
  uptime_seconds: number
  car_state: {
    status: string
    last_command?: string
    last_command_time?: string
    speed?: number
    position?: Record<string, number>
    uptime_seconds: number
  }
}

export type MoveCommand = {
  command:
    | 'forward'
    | 'backward'
    | 'left'
    | 'right'
    | 'forward_left'
    | 'forward_right'
    | 'backward_left'
    | 'backward_right'
  duration_ms?: number
  speed?: number
}

let BASE_URL =
  (typeof window !== 'undefined' && window.localStorage.getItem('apiBaseUrl')) ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'

export function getBaseUrl() {
  return BASE_URL
}

export function setBaseUrl(url: string) {
  BASE_URL = url
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('apiBaseUrl', url)
  }
}

export class ResponseError extends Error {
  code?: string
  trace_id?: string
  mode?: string
  details?: any
  status: number
  constructor(message: string, init?: Partial<ResponseError>) {
    super(message)
    this.name = 'ResponseError'
    this.status = init?.status ?? 0
    this.code = init?.code
    this.trace_id = init?.trace_id
    this.mode = init?.mode
    this.details = init?.details
  }
}

type RequestOptions = RequestInit & { timeoutMs?: number }

async function request<T>(path: string, init?: RequestOptions): Promise<SuccessResponse<T>> {
  const isFormData = !!(init && init.body && typeof FormData !== 'undefined' && init.body instanceof FormData)
  const headers = init?.headers ?? (isFormData ? undefined : { 'Content-Type': 'application/json' })

  const controller = new AbortController()
  const timeoutMs = init?.timeoutMs ?? 10000
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      // Avoid passing custom field to fetch
      signal: controller.signal,
    })
    if (!res.ok) {
      // Try to parse unified error format: FastAPI wraps as { detail: { code, message, trace_id, mode, details? } }
      let body: any = undefined
      try {
        body = await res.json()
      } catch {}
      const errPayload = body?.detail ?? body ?? {}
      const message = errPayload?.message || `HTTP ${res.status}`
      const err = new ResponseError(message, {
        status: res.status,
        code: errPayload?.code,
        trace_id: errPayload?.trace_id,
        mode: errPayload?.mode,
        details: errPayload?.details,
      })
      throw err
    }
    return res.json()
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ResponseError('网络请求超时', {
        status: 0,
        code: 'NETWORK_TIMEOUT',
      })
    }
    // Fetch network error (DNS failure, refused, etc.)
    throw new ResponseError(e?.message || '网络请求失败', {
      status: 0,
      code: 'NETWORK_ERROR',
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export type ConfigData = {
  api_key?: string | null
  llm_provider: string
  telemetry_enabled: boolean
  discovery_enabled: boolean
  allowed_origins: string[]
  notes: string
  coze_workspace_id?: string | null
}

export type ConfigResponse = {
  success: boolean
  data: {
    config: ConfigData
    version: string
  }
  message: string
  trace_id: string
}

export type ConfigUpdateResponse = {
  success: boolean
  data: {
    message: string
    config: ConfigData
  }
  message: string
  trace_id: string
}

export type ConfigSchema = {
  type: string
  properties: Record<string, any>
  required?: string[]
}

// Coze Conversations API types
export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ConversationCreateRequest = {
  messages?: ConversationMessage[]
}

export type ConversationResponse = {
  id: string
}

export type ConversationDeleteResponse = {
  id: string
  deleted: boolean
}

export type StreamChatRequest = {
  text: string
  bot_id: string
  user_id?: string
  conversation_id?: string
}

export interface StreamChatEvent {
  type: 'conversation_id' | 'content' | 'completed' | 'error' | 'done'
  content?: string
  error_code?: string
  trace_id?: string
}

// Coze Audio API types
export type Voice = {
  voice_id: string
  name: string
  preview_audio?: string
}

export type VoicesResponse = {
  voices: Voice[]
}

export type VoiceIdResponse = {
  voice_id: string | null
}

// Coze Workspace ID
export type WorkspaceIdResponse = {
  workspace_id: string | null
}

// Chat with Audio types
export type ChatAudioRequest = {
  input_text: string
  bot_id: string
  user_id?: string
  conversation_id?: string
  filename_prefix?: string
  play?: boolean
}

export type ChatAudioResponse = {
  input_audio_path: string
  response_audio_path: string
  conversation_id: string
  voice_id: string
}

// TTS
export type TTSRequest = {
  input_text: string
  filename_prefix?: string
  play?: boolean
}

export type TTSResult = {
  tts_audio_path: string
  voice_id: string
}

// Coze Bots types
// Audio Transcriptions (ASR)
export type AudioTranscriptionsResult = {
  text: string
  logid?: string
}
// Camera Snapshot types
export type CameraSnapshotRequest = {
  width?: number
  height?: number
  quality?: number
}

export type CameraSnapshotData = {
  snapshot: {
    saved_path: string
    base64: string
    width: number
    height: number
    jpeg_quality: number
    timestamp: string
  }
  ros2_topic: string
  runtime_mode: string
}

// Buzzer Set types
export type BuzzerSetRequest = {
  freq?: number
  on_time?: number
  off_time?: number
  repeat?: number
}

export type BuzzerSetData = {
  buzzer: {
    freq: number
    on_time: number
    off_time: number
    repeat: number
    timestamp: string
  }
  ros2_topic?: string
  runtime_mode: string
}

// Coze Bots types
export type CozeBot = {
  id: string
  name: string
  description?: string
  is_published?: boolean
  published_at?: number
  updated_at?: number
  icon_url?: string
  owner_user_id?: string
}

// Coze Bot Create types
export type BotCreatePayload = {
  workspace_id?: string | null
  name: string
  description?: string | null
  avatar_path?: string | null
  bot_prompt: string
  prologue: string
  suggested_questions: [string, string, string]
  customized_prompt?: string | null
  model_id?: string
  temperature?: number
  max_tokens?: number
  response_format?: string
}

export type BotCreateResult = {
  bot: Record<string, any>
  logid?: string
}

// Coze Bot Retrieve types
export type BotRetrieveResult = {
  bot: Record<string, any>
  logid?: string
}

// Coze File Upload types
export type CozeUploadedFileMetadata = {
  id?: string
  name?: string
  size?: number
  mime_type?: string
  created_at?: number
}

export type CozeFileUploadData = {
  file_id: string | null
  file?: CozeUploadedFileMetadata
}

// Internal helper: unified SSE reader for Coze chat endpoints
async function* streamSSE(
  url: string,
  data: Record<string, any>,
  logPrefix: string
): AsyncGenerator<StreamChatEvent, void, unknown> {
  console.log(`🚀 [${logPrefix}] Starting stream request:`, data)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorMsg = `HTTP ${response.status}: ${response.statusText}`
    console.error(`❌ [${logPrefix}] Stream request failed:`, errorMsg)
    throw new Error(errorMsg)
  }

  console.log(`✅ [${logPrefix}] Stream connection established`)
  const reader = response.body?.getReader()
  if (!reader) {
    const error = 'Response body is not readable'
    console.error(`❌ [${logPrefix}] Stream reader error:`, error)
    throw new Error(error)
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log(`📡 [${logPrefix}] Stream ended`)
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(line.slice(6)) as StreamChatEvent
            console.log(`📨 [${logPrefix}] Received stream event:`, eventData.type, eventData.trace_id)
            if (eventData.type === 'error') {
              console.error(`❌ [${logPrefix}] Stream error received:`, eventData.content, eventData.error_code)
            }
            yield eventData
            if (eventData.type === 'done' || eventData.type === 'error') {
              console.log(`🏁 [${logPrefix}] Stream terminated:`, eventData.type)
              return
            }
          } catch (e) {
            console.warn(`⚠️ [${logPrefix}] Failed to parse SSE data:`, line, e)
          }
        }
      }
    }
  } finally {
    console.log(`🔒 [${logPrefix}] Releasing stream reader`)
    reader.releaseLock()
  }
}

export const api = {
  // Status
  getStatus: () => request<SystemStatus>('/status/'),
  getHealth: () => request<HealthData>('/status/health'),
  getMode: () => request<{ runtime_mode: string }>('/status/mode'),

  // Control
  move: (cmd: MoveCommand) =>
    request<Record<string, any>>('/control/move', {
      method: 'POST',
      body: JSON.stringify(cmd),
    }),
  stop: () =>
    request<Record<string, any>>('/control/stop', {
      method: 'POST',
    }),
  estop: () =>
    request<Record<string, any>>('/control/estop', {
      method: 'POST',
    }),
  getControlState: () => request<Record<string, any>>('/control/state'),

  // Configuration
  getConfig: (includeSecrets = false) => 
    request<ConfigResponse['data']>(`/api/v1/config/?include_secrets=${includeSecrets}`),
  
  updateConfig: (config: ConfigData) =>
    request<ConfigUpdateResponse['data']>('/api/v1/config/', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  
  patchConfig: (partialConfig: Partial<ConfigData>) =>
    request<ConfigUpdateResponse['data']>('/api/v1/config/', {
      method: 'PATCH',
      body: JSON.stringify(partialConfig),
    }),
  
  resetConfig: () =>
    request<ConfigUpdateResponse['data']>('/api/v1/config/reset', {
      method: 'POST',
    }),
  
  getConfigSchema: () =>
    request<ConfigSchema>('/api/v1/config/schema'),
  
  getConfigWithSecrets: () =>
    request<ConfigResponse['data']>('/api/v1/config/secrets'),

  // Coze Conversations
  createConversation: (data: ConversationCreateRequest) =>
    request<ConversationResponse>('/api/v1/coze/conversations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getConversation: (conversationId: string) =>
    request<ConversationResponse>(`/api/v1/coze/conversations/${conversationId}`),
  
  deleteConversation: (conversationId: string) =>
    request<ConversationDeleteResponse>(`/api/v1/coze/conversations/${conversationId}`, {
      method: 'DELETE',
    }),

  // Stream chat with Coze bot
  streamChat: async function* (data: StreamChatRequest): AsyncGenerator<StreamChatEvent, void, unknown> {
    console.log('🚀 Starting stream chat request:', data)
    
    const response = await fetch(`${BASE_URL}/api/v1/coze/conversations/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`
      console.error('❌ Stream chat request failed:', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Stream chat connection established')
    const reader = response.body?.getReader()
    if (!reader) {
      const error = 'Response body is not readable'
      console.error('❌ Stream reader error:', error)
      throw new Error(error)
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('📡 Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamChatEvent
              console.log('📨 Received stream event:', eventData.type, eventData.trace_id)
              
              if (eventData.type === 'error') {
                console.error('❌ Stream error received:', eventData.content, eventData.error_code)
              }
              
              yield eventData
              if (eventData.type === 'done' || eventData.type === 'error') {
                console.log('🏁 Stream terminated:', eventData.type)
                return
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse SSE data:', line, e)
            }
          }
        }
      }
    } finally {
      console.log('🔒 Releasing stream reader')
      reader.releaseLock()
    }
  },

  // Stream chat with Coze bot (plugins handling)
  streamChatPlugins: async function* (data: StreamChatRequest): AsyncGenerator<StreamChatEvent, void, unknown> {
    console.log('🔌 Starting plugin stream chat request:', data)

    const response = await fetch(`${BASE_URL}/api/v1/coze/conversations/stream/plugins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`
      console.error('❌ Plugin stream chat request failed:', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Plugin stream chat connection established')
    const reader = response.body?.getReader()
    if (!reader) {
      const error = 'Response body is not readable'
      console.error('❌ Plugin stream reader error:', error)
      throw new Error(error)
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('📡 Plugin stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamChatEvent
              console.log('📨 Received plugin stream event:', eventData.type, eventData.trace_id)
              
              if (eventData.type === 'error') {
                console.error('❌ Plugin stream error received:', eventData.content, eventData.error_code)
              }
              
              yield eventData
              if (eventData.type === 'done' || eventData.type === 'error') {
                console.log('🏁 Plugin stream terminated:', eventData.type)
                return
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse plugin SSE data:', line, e)
            }
          }
        }
      }
    } finally {
      console.log('🔒 Releasing plugin stream reader')
      reader.releaseLock()
    }
  },

  // Unified stream chat (standard or plugins)
  streamChatUnified: async function* (
    data: StreamChatRequest,
    opts?: { usePlugins?: boolean }
  ): AsyncGenerator<StreamChatEvent, void, unknown> {
    const usePlugins = !!opts?.usePlugins
    const path = usePlugins
      ? '/api/v1/coze/conversations/stream/plugins'
      : '/api/v1/coze/conversations/stream'
    const label = usePlugins ? 'Plugin' : 'Standard'
    yield* streamSSE(`${BASE_URL}${path}`, data, label)
  },

  // Coze Audio
  listVoices: () => request<VoicesResponse>('/api/v1/coze/audio/voices'),
  getVoiceId: () => request<VoiceIdResponse>('/api/v1/coze/audio/voice_id'),
  setVoiceId: (voice_id: string) =>
    request<VoiceIdResponse>('/api/v1/coze/audio/voice_id', {
      method: 'PUT',
      body: JSON.stringify({ voice_id }),
    }),
  chatWithAudio: (data: ChatAudioRequest) =>
    request<ChatAudioResponse>('/api/v1/coze/audio/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // TTS synthesize and optional playback
  tts: (data: TTSRequest) =>
    request<TTSResult>('/api/v1/coze/audio/tts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Audio Transcriptions (ASR)
  transcribeAudio: (file: File) => {
    const form = new FormData()
    // Preserve filename for backend mime detection and logs
    form.append('file', file, file.name || 'recording.wav')
    return request<AudioTranscriptionsResult>('/api/v1/coze/audio/transcriptions', {
      method: 'POST',
      body: form,
    })
  },

  // Camera Snapshot
  cameraSnapshot: (data: CameraSnapshotRequest) =>
    request<CameraSnapshotData>('/api/v1/camera/snapshot', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Buzzer Set
  buzzerSet: (data: BuzzerSetRequest) =>
    request<BuzzerSetData>('/api/v1/buzzer/set', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Coze Bots
  listCozeBots: () => request<{ bots: CozeBot[] }>('/api/v1/coze/bots/list'),
  getCozeWorkspaceId: () => request<WorkspaceIdResponse>('/api/v1/coze/workspace/id'),
  createCozeBot: (data: BotCreatePayload | FormData) =>
    request<BotCreateResult>('/api/v1/coze/bots/create', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  getCozeBot: (botId: string) =>
    request<BotRetrieveResult>(`/api/v1/coze/bots/${botId}`),

  // Coze Files
  uploadCozeFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<CozeFileUploadData>('/api/v1/coze/files/upload', {
      method: 'POST',
      body: form,
    })
  },

  // Stream chat with audio (SSE)
  chatWithAudioStream: async function* (data: ChatAudioRequest): AsyncGenerator<StreamChatEvent, void, unknown> {
    console.log('🎧 Starting audio chat stream:', data)

    const response = await fetch(`${BASE_URL}/api/v1/coze/audio/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`
      console.error('❌ Audio chat stream request failed:', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Audio chat stream connection established')
    const reader = response.body?.getReader()
    if (!reader) {
      const error = 'Response body is not readable'
      console.error('❌ Stream reader error:', error)
      throw new Error(error)
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('📡 Audio chat stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamChatEvent
              console.log('📨 Received audio stream event:', eventData.type)
              
              yield eventData
              if (eventData.type === 'done' || eventData.type === 'error') {
                console.log('🏁 Audio chat stream terminated:', eventData.type)
                return
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse audio SSE data:', line, e)
            }
          }
        }
      }
    } finally {
      console.log('🔒 Releasing audio stream reader')
      reader.releaseLock()
    }
  },

  // Stream chat with image (SSE, multipart/form-data)
  imageChatStream: async function* (data: {
    file?: File
    text: string
    bot_id: string
    user_id?: string
    conversation_id?: string
  }): AsyncGenerator<StreamChatEvent, void, unknown> {
    console.log('🖼️ Starting image chat stream:', { hasFile: !!data.file, textLen: data.text?.length, botId: data.bot_id })

    const form = new FormData()
    form.append('text', data.text)
    form.append('bot_id', data.bot_id)
    if (data.user_id) form.append('user_id', data.user_id)
    if (data.conversation_id) form.append('conversation_id', data.conversation_id)
    if (data.file) form.append('file', data.file)

    const response = await fetch(`${BASE_URL}/api/v1/coze/image/chat/stream`, {
      method: 'POST',
      body: form, // Let browser set multipart boundary
    })

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`
      console.error('❌ Image chat stream request failed:', errorMsg)
      throw new Error(errorMsg)
    }

    console.log('✅ Image chat stream connection established')
    const reader = response.body?.getReader()
    if (!reader) {
      const error = 'Response body is not readable'
      console.error('❌ Stream reader error:', error)
      throw new Error(error)
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('📡 Image chat stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as StreamChatEvent
              console.log('📨 Received image stream event:', eventData.type)

              yield eventData
              if (eventData.type === 'done' || eventData.type === 'error') {
                console.log('🏁 Image chat stream terminated:', eventData.type)
                return
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse image SSE data:', line, e)
            }
          }
        }
      }
    } finally {
      console.log('🔒 Releasing image stream reader')
      reader.releaseLock()
    }
  },
}