import type { DocsModule } from './types'

export const modules: DocsModule[] = [
  {
    id: 'status',
    title: '状态',
    description: '查询系统服务运行状态。',
    endpoints: [
      {
        id: 'status-get',
        module: 'status',
        title: '获取系统状态',
        method: 'GET',
        path: '/status',
        summary: '返回当前系统状态、运行模式与服务信息。',
        stability: 'stable',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json', example: { code: 'SUCCESS', message: 'Status retrieved successfully', data: { runtime_mode: 'macbook_sim', service_name: 'turbopi_backend', port: 8000, uptime_seconds: 123.45 }, trace_id: 'uuid', mode: 'macbook_sim' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/status | jq` },
        ],
      },
      {
        id: 'status-health',
        module: 'status',
        title: '健康检查',
        method: 'GET',
        path: '/status/health',
        summary: '用于监控与负载均衡的健康检查。',
        stability: 'stable',
        responses: [
          { status: 200, description: '健康', contentType: 'application/json', example: { success: true, code: 'SUCCESS', message: 'Service is healthy', data: { status: 'healthy', runtime_mode: 'macbook_sim', uptime_seconds: 123.45, runtime_initialized: true, provider_available: true, timestamp: '2025-11-03T11:00:19.379915' }, trace_id: 'uuid', mode: 'macbook_sim' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/status/health | jq` },
        ],
      },
      {
        id: 'status-mode',
        module: 'status',
        title: '运行模式信息',
        method: 'GET',
        path: '/status/mode',
        summary: '返回当前运行模式与能力可用性。',
        stability: 'stable',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/status/mode | jq` },
        ],
      },
    ],
  },

  {
    id: 'config',
    title: '配置管理',
    description: '读取、更新、部分更新、Schema、重置与敏感字段。',
    endpoints: [
      {
        id: 'config-get',
        module: 'config',
        title: '获取配置',
        method: 'GET',
        path: '/api/v1/config/',
        summary: '返回当前配置，默认屏蔽敏感字段。',
        queryParams: [
          { name: 'include_secrets', type: 'boolean', description: '为 true 返回未屏蔽敏感字段' },
        ],
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 500, description: '读取错误', contentType: 'application/json', example: { code: 'CONFIG_READ_ERROR', message: 'Failed to read configuration' } },
        ],
        examples: [
          { title: 'cURL(屏蔽敏感)', language: 'bash', code: `curl -s '$BASE_URL/api/v1/config/' | jq` },
          { title: 'cURL(含敏感)', language: 'bash', code: `curl -s '$BASE_URL/api/v1/config/?include_secrets=true' | jq` },
        ],
      },
      {
        id: 'config-put',
        module: 'config',
        title: '更新配置(全量)',
        method: 'PUT',
        path: '/api/v1/config/',
        summary: '整体更新配置，严格校验。',
        requestBody: [
          { name: 'llm_provider', type: 'string' },
          { name: 'api_key', type: 'string' },
          { name: 'coze_voice_id', type: 'string' },
          { name: 'coze_workspace_id', type: 'string' },
          { name: 'notes', type: 'string' },
        ],
        responses: [
          { status: 200, description: '更新成功', contentType: 'application/json' },
          { status: 422, description: '校验失败', contentType: 'application/json', example: { code: 'CONFIG_VALIDATION_ERROR', message: 'Configuration validation failed' } },
          { status: 500, description: '更新错误', contentType: 'application/json', example: { code: 'CONFIG_UPDATE_ERROR', message: 'Failed to update configuration' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X PUT '$BASE_URL/api/v1/config/' -H 'Content-Type: application/json' -d '{"llm_provider":"coze","api_key":"<your key>","coze_voice_id":"1737521813"}' | jq` },
        ],
      },
      {
        id: 'config-patch',
        module: 'config',
        title: '部分更新配置',
        method: 'PATCH',
        path: '/api/v1/config/',
        summary: '部分更新配置，按 Schema 校验。',
        requestBody: [
          { name: 'notes', type: 'string' },
        ],
        responses: [
          { status: 200, description: '更新成功', contentType: 'application/json' },
          { status: 422, description: '校验失败', contentType: 'application/json', example: { code: 'CONFIG_VALIDATION_ERROR', message: 'Configuration validation failed' } },
          { status: 500, description: '更新错误', contentType: 'application/json', example: { code: 'CONFIG_PATCH_ERROR', message: 'Failed to patch configuration' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X PATCH '$BASE_URL/api/v1/config/' -H 'Content-Type: application/json' -d '{"notes":"updated"}' | jq` },
        ],
      },
      {
        id: 'config-schema',
        module: 'config',
        title: '获取配置 Schema',
        method: 'GET',
        path: '/api/v1/config/schema',
        summary: '返回用于客户端校验的 JSON Schema。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 500, description: '获取错误', contentType: 'application/json', example: { code: 'SCHEMA_ERROR', message: 'Failed to get configuration schema' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s '$BASE_URL/api/v1/config/schema' | jq` },
        ],
      },
      {
        id: 'config-reset',
        module: 'config',
        title: '重置为默认配置',
        method: 'POST',
        path: '/api/v1/config/reset',
        summary: '重置配置为默认值。',
        responses: [
          { status: 200, description: '重置成功', contentType: 'application/json' },
          { status: 500, description: '重置错误', contentType: 'application/json', example: { code: 'CONFIG_RESET_ERROR', message: 'Failed to reset configuration' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X POST '$BASE_URL/api/v1/config/reset' | jq` },
        ],
      },
      {
        id: 'config-secrets',
        module: 'config',
        title: '获取含敏感字段配置',
        method: 'GET',
        path: '/api/v1/config/secrets',
        summary: '返回未屏蔽敏感字段（生产需加固访问）。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 500, description: '读取错误', contentType: 'application/json', example: { code: 'CONFIG_SECRETS_ERROR', message: 'Failed to read configuration with secrets' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s '$BASE_URL/api/v1/config/secrets' | jq` },
        ],
      },
    ],
  },
  {
    id: 'control',
    title: '控制',
    description: '蜂鸣器控制与实验性移动控制。',
    endpoints: [
      {
        id: 'buzzer-set',
        module: 'control',
        title: '设置蜂鸣器',
        method: 'POST',
        path: '/api/v1/buzzer/set',
        summary: '通过频率与时间参数控制蜂鸣器行为。',
        requestBody: [
          { name: 'freq', type: 'number', description: '蜂鸣器频率(Hz)' },
          { name: 'on_time', type: 'number', description: '开灯时间(秒)' },
          { name: 'off_time', type: 'number', description: '关灯时间(秒)' },
          { name: 'repeat', type: 'number', description: '重复次数(0为一次)' },
        ],
        responses: [
          { status: 200, description: '设置成功', contentType: 'application/json', example: { code: 'SUCCESS', message: 'Buzzer state set', data: { buzzer: { freq: 1900, on_time: 0.2, off_time: 0.01, repeat: 0 } } } },
          { status: 422, description: '参数错误或运行限制', contentType: 'application/json', example: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/buzzer/set -H 'Content-Type: application/json' -d '{"freq":1900,"on_time":0.2,"off_time":0.01,"repeat":0}' | jq` },
        ],
      },
      {
        id: 'control-move',
        module: 'control',
        title: '移动控制（实验）',
        method: 'POST',
        path: '/control/move',
        summary: '按照指定方向与速度移动，支持时长控制。',
        stability: 'experimental',
        requestBody: [
          { name: 'command', type: 'string', description: 'forward/backward/left/right/forward_left/forward_right/backward_left/backward_right' },
          { name: 'speed', type: 'number', description: '速度 0~1' },
          { name: 'duration_ms', type: 'number', description: '持续时间（毫秒）' },
        ],
        responses: [
          { status: 200, description: '已下发移动指令', contentType: 'application/json', example: { code: 'SUCCESS', message: 'Command executed' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X POST $BASE_URL/control/move -H 'Content-Type: application/json' -d '{"command":"forward","duration_ms":1000,"speed":0.7}' | jq` },
        ],
      },
      {
        id: 'control-stop',
        module: 'control',
        title: '正常停止',
        method: 'POST',
        path: '/control/stop',
        summary: '以正常方式停止车辆。',
        responses: [
          { status: 200, description: '停止成功', contentType: 'application/json' },
          { status: 422, description: '控制错误', contentType: 'application/json', example: { code: 'CONTROL_ERROR', message: 'Control operation failed' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X POST $BASE_URL/control/stop | jq` },
        ],
      },
      {
        id: 'control-estop',
        module: 'control',
        title: '紧急停止',
        method: 'POST',
        path: '/control/estop',
        summary: '立即紧急停车，最高优先级。',
        responses: [
          { status: 200, description: '紧急停止成功', contentType: 'application/json' },
          { status: 408, description: '超时错误', contentType: 'application/json', example: { code: 'TIMEOUT_ERROR', message: 'Operation timed out' } },
          { status: 422, description: '控制错误', contentType: 'application/json', example: { code: 'CONTROL_ERROR', message: 'Control operation failed' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -X POST $BASE_URL/control/estop | jq` },
        ],
      },
      {
        id: 'control-state',
        module: 'control',
        title: '控制状态',
        method: 'GET',
        path: '/control/state',
        summary: '返回车辆当前状态与位置信息等。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 500, description: '运行时错误', contentType: 'application/json', example: { code: 'RUNTIME_ERROR', message: 'Runtime operation failed' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/control/state | jq` },
        ],
      },
    ],
  },

  {
    id: 'camera',
    title: '相机',
    description: '拍摄静态快照。',
    endpoints: [
      {
        id: 'camera-snapshot',
        module: 'camera',
        title: '拍照快照',
        method: 'POST',
        path: '/api/v1/camera/snapshot',
        summary: '返回快照文件信息或数据。',
        requestBody: [
          { name: 'width', type: 'number', description: '宽度像素' },
          { name: 'height', type: 'number', description: '高度像素' },
          { name: 'quality', type: 'number', description: 'JPEG 质量 1~100' },
        ],
        responses: [
          { status: 200, description: '成功', contentType: 'application/json', example: { code: 'SUCCESS', message: 'Camera snapshot captured', data: { snapshot: { saved_path: '~/Downloads/turbopi_snapshot.jpg', width: 640, height: 480, jpeg_quality: 80 } } } },
          { status: 422, description: '摄像头不可用或超时', contentType: 'application/json', example: { code: 'VALIDATION_ERROR', message: 'Camera unavailable or timeout' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/camera/snapshot -H 'Content-Type: application/json' -d '{"width":640,"height":480,"quality":80}' | jq` },
        ],
      },
    ],
  },

  {
    id: 'llm',
    title: 'LLM 与会话',
    description: 'Coze 会话、流式聊天、音色、TTS、文件与图片对话。',
    endpoints: [
      {
        id: 'conv-create',
        module: 'llm',
        title: '创建会话',
        method: 'POST',
        path: '/api/v1/coze/conversations',
        summary: '创建新的 Coze 会话，可带初始消息。',
        requestBody: [
          { name: 'messages', type: 'array', description: '初始消息数组[{role, content}]' },
        ],
        responses: [
          { status: 200, description: '已创建', contentType: 'application/json', example: { data: { id: 'conv_123' }, code: 'SUCCESS' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/conversations -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"你好"}]}' | jq` },
        ],
      },
      {
        id: 'conv-stream',
        module: 'llm',
        title: '流式聊天 (SSE)',
        method: 'POST',
        path: '/api/v1/coze/conversations/stream',
        summary: '与 Coze bot 的流式聊天，返回 SSE。',
        requestBody: [
          { name: 'text', type: 'string', description: '用户消息' },
          { name: 'bot_id', type: 'string', description: 'Coze bot ID' },
          { name: 'conversation_id', type: 'string', description: '会话ID' },
        ],
        responses: [
          { status: 200, description: 'SSE 流', contentType: 'text/event-stream' },
          { status: 400, description: '参数错误', contentType: 'application/json' },
          { status: 500, description: '服务错误', contentType: 'application/json' },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -N -X POST $BASE_URL/api/v1/coze/conversations/stream -H 'Content-Type: application/json' -d '{"text":"你好","bot_id":"7458..."}'` },
        ],
      },
      {
        id: 'conv-stream-plugins',
        module: 'llm',
        title: '流式聊天/插件 (SSE)',
        method: 'POST',
        path: '/api/v1/coze/conversations/stream/plugins',
        summary: '流式聊天并处理本地插件演示事件。',
        requestBody: [
          { name: 'text', type: 'string' },
          { name: 'bot_id', type: 'string' },
        ],
        responses: [
          { status: 200, description: 'SSE 流', contentType: 'text/event-stream' },
        ],
      },
      {
        id: 'conv-get',
        module: 'llm',
        title: '查询会话',
        method: 'GET',
        path: '/api/v1/coze/conversations/{conversation_id}',
        summary: '查询会话ID详情。',
        pathParams: [
          { name: 'conversation_id', type: 'string', required: true },
        ],
        responses: [
          { status: 200, description: '查询成功', contentType: 'application/json' },
        ],
      },
      {
        id: 'conv-delete',
        module: 'llm',
        title: '删除会话',
        method: 'DELETE',
        path: '/api/v1/coze/conversations/{conversation_id}',
        pathParams: [
          { name: 'conversation_id', type: 'string', required: true },
        ],
        responses: [
          { status: 200, description: '删除成功', contentType: 'application/json' },
        ],
      },
      {
        id: 'audio-voices',
        module: 'llm',
        title: '音色列表',
        method: 'GET',
        path: '/api/v1/coze/audio/voices',
        summary: '列出可用的音色。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
        ],
      },
      {
        id: 'voice-id-get',
        module: 'llm',
        title: '获取当前音色ID',
        method: 'GET',
        path: '/api/v1/coze/audio/voice_id',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
        ],
      },
      {
        id: 'voice-id-put',
        module: 'llm',
        title: '设置当前音色ID',
        method: 'PUT',
        path: '/api/v1/coze/audio/voice_id',
        requestBody: [
          { name: 'voice_id', type: 'string', required: true },
        ],
        responses: [
          { status: 200, description: '更新成功', contentType: 'application/json' },
        ],
      },
      {
        id: 'audio-chat',
        module: 'llm',
        title: '音频聊天',
        method: 'POST',
        path: '/api/v1/coze/audio/chat',
        summary: '合成输入音频并聊天，保存 WAV 响应文件。',
        requestBody: [
          { name: 'input_text', type: 'string', required: true },
          { name: 'bot_id', type: 'string', required: true },
          { name: 'conversation_id', type: 'string' },
          { name: 'filename_prefix', type: 'string' },
          { name: 'play', type: 'boolean' },
        ],
        responses: [
          { status: 200, description: '完成并保存文件', contentType: 'application/json' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
      },
      {
        id: 'audio-chat-stream',
        module: 'llm',
        title: '音频聊天(流式)',
        method: 'POST',
        path: '/api/v1/coze/audio/chat/stream',
        summary: '音频输入并通过 SSE 流式返回文本。',
        requestBody: [
          { name: 'input_text', type: 'string', required: true },
          { name: 'bot_id', type: 'string', required: true },
          { name: 'conversation_id', type: 'string' },
          { name: 'filename_prefix', type: 'string' },
          { name: 'play', type: 'boolean' },
        ],
        responses: [
          { status: 200, description: 'SSE 流', contentType: 'text/event-stream' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
      },
      {
        id: 'tts',
        module: 'llm',
        title: 'TTS 合成',
        method: 'POST',
        path: '/api/v1/coze/audio/tts',
        summary: '文本转语音并可选择播放。',
        requestBody: [
          { name: 'input_text', type: 'string', required: true },
          { name: 'filename_prefix', type: 'string' },
          { name: 'play', type: 'boolean' },
        ],
        responses: [
          { status: 200, description: '合成成功', contentType: 'application/json' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
      },
      {
        id: 'audio-transcriptions',
        module: 'llm',
        title: '语音转写',
        method: 'POST',
        path: '/api/v1/coze/audio/transcriptions',
        summary: 'multipart 上传音频文件并返回识别文本。',
        requestBody: [
          { name: 'file', type: 'string', required: true, description: 'multipart/form-data 文件' },
        ],
        responses: [
          { status: 200, description: '转写成功', contentType: 'application/json' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/audio/transcriptions -F 'file=@/path/to/audio.wav' | jq` },
        ],
      },
      {
        id: 'file-upload',
        module: 'llm',
        title: '文件上传',
        method: 'POST',
        path: '/api/v1/coze/files/upload',
        summary: 'multipart 上传本地文件到 Coze 并返回 file_id。',
        requestBody: [
          { name: 'file', type: 'string', required: true, description: 'multipart/form-data 文件' },
        ],
        responses: [
          { status: 200, description: '上传成功', contentType: 'application/json' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/files/upload -F 'file=@/path/to/file.txt' | jq` },
        ],
      },
      {
        id: 'image-chat-stream',
        module: 'llm',
        title: '图片对话(流式)',
        method: 'POST',
        path: '/api/v1/coze/image/chat/stream',
        summary: '可选图片 + 文本指令，返回 SSE 事件。',
        requestBody: [
          { name: 'file', type: 'string', description: 'multipart 图片(可选)' },
          { name: 'text', type: 'string', required: true },
          { name: 'bot_id', type: 'string', required: true },
          { name: 'user_id', type: 'string' },
          { name: 'conversation_id', type: 'string' },
        ],
        responses: [
          { status: 200, description: 'SSE 流', contentType: 'text/event-stream' },
          { status: 422, description: '不可处理的实体', contentType: 'application/json' },
        ],
      },
      {
        id: 'workspace-id',
        module: 'llm',
        title: '获取 Coze 工作空间ID',
        method: 'GET',
        path: '/api/v1/coze/workspace/id',
        summary: '返回当前后端使用的 Coze workspace_id。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 422, description: '错误', contentType: 'application/json', example: { code: 'COZE_WORKSPACE_ID_ERROR', message: 'Failed to get workspace id' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/api/v1/coze/workspace/id | jq` },
        ],
      },
      {
        id: 'bots-list',
        module: 'llm',
        title: '机器人列表',
        method: 'GET',
        path: '/api/v1/coze/bots/list',
        summary: '列出当前工作空间的机器人。',
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 422, description: '错误', contentType: 'application/json', example: { code: 'COZE_BOTS_LIST_ERROR', message: 'Failed to list bots' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s $BASE_URL/api/v1/coze/bots/list | jq` },
        ],
      },
      {
        id: 'bot-get',
        module: 'llm',
        title: '机器人详情',
        method: 'GET',
        path: '/api/v1/coze/bots/{bot_id}',
        summary: '获取指定机器人详情。',
        pathParams: [
          { name: 'bot_id', type: 'string', required: true },
        ],
        responses: [
          { status: 200, description: '成功', contentType: 'application/json' },
          { status: 422, description: '错误', contentType: 'application/json', example: { code: 'COZE_BOT_RETRIEVE_ERROR', message: 'Failed to retrieve bot' } },
        ],
      },
      {
        id: 'bot-create',
        module: 'llm',
        title: '创建机器人',
        method: 'POST',
        path: '/api/v1/coze/bots/create',
        summary: '在工作空间创建机器人，支持 JSON 或 multipart(含头像)。',
        requestBody: [
          { name: 'workspace_id', type: 'string', description: '可选，未提供使用后端配置' },
          { name: 'name', type: 'string', required: true },
          { name: 'description', type: 'string' },
          { name: 'avatar_path', type: 'string' },
          { name: 'bot_prompt', type: 'string', required: true },
          { name: 'prologue', type: 'string', required: true },
          { name: 'suggested_questions', type: 'array', description: '建议问题(3条)' },
          { name: 'customized_prompt', type: 'string' },
          { name: 'model_id', type: 'string' },
          { name: 'temperature', type: 'number' },
          { name: 'max_tokens', type: 'number' },
          { name: 'response_format', type: 'string' },
          { name: 'avatar', type: 'string', description: 'multipart 上传头像(可选)' },
        ],
        responses: [
          { status: 200, description: '创建成功', contentType: 'application/json' },
          { status: 422, description: '无效请求或上传错误', contentType: 'application/json', example: { code: 'COZE_BOT_CREATE_INVALID_BODY', message: 'Invalid request body' } },
        ],
        examples: [
          { title: 'cURL(JSON)', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/bots/create -H 'Content-Type: application/json' -d '{"name":"Demo","bot_prompt":"You are helpful","prologue":"Welcome","suggested_questions":["Q1","Q2","Q3"]}' | jq` },
          { title: 'cURL(multipart)', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/bots/create -F 'name=Demo' -F 'bot_prompt=You are helpful' -F 'prologue=Welcome' -F 'suggested_questions=Q1' -F 'suggested_questions=Q2' -F 'suggested_questions=Q3' -F 'avatar=@/path/to/avatar.png' | jq` },
        ],
      },
      {
        id: 'bot-unpublish',
        module: 'llm',
        title: '取消发布机器人',
        method: 'POST',
        path: '/api/v1/coze/bots/{bot_id}/unpublish',
        summary: '从指定连接器取消发布(默认 API 通道: 1024)。',
        pathParams: [
          { name: 'bot_id', type: 'string', required: true },
        ],
        requestBody: [
          { name: 'connector_id', type: 'string', description: '连接器ID(默认 1024)' },
        ],
        responses: [
          { status: 200, description: '取消发布成功', contentType: 'application/json' },
          { status: 422, description: '错误', contentType: 'application/json', example: { code: 'COZE_BOT_UNPUBLISH_ERROR', message: 'Failed to unpublish bot' } },
        ],
        examples: [
          { title: 'cURL', language: 'bash', code: `curl -s -X POST $BASE_URL/api/v1/coze/bots/123/unpublish -H 'Content-Type: application/json' -d '{"connector_id":"1024"}' | jq` },
        ],
      },
    ],
  },
]