import { useState } from 'react'
import { api } from '../lib/api'
import type { MoveCommand } from '../lib/api'
import {
  Button,
  Card,
  Grid,
  Slider,
  InputNumber,
  Tag,
  Space,
  Alert,
  Typography,
} from '@arco-design/web-react'

type ActionState = {
  busy: boolean
  message?: string
  error?: string
}

const { Row, Col } = Grid
const { Title, Text } = Typography

export function ControlPanel() {
  const [speed, setSpeed] = useState(0.6)
  const [durationMs, setDurationMs] = useState<number | undefined>(undefined)
  const [state, setState] = useState<ActionState>({ busy: false })

  const doMove = async (command: MoveCommand['command']) => {
    setState({ busy: true })
    try {
      const payload: MoveCommand = { command, speed }
      if (typeof durationMs === 'number') payload.duration_ms = durationMs
      const res = await api.move(payload)
      setState({ busy: false, message: res.message })
    } catch (e: any) {
      setState({ busy: false, error: e.message })
    }
  }

  const doStop = async () => {
    setState({ busy: true })
    try {
      const res = await api.stop()
      setState({ busy: false, message: res.message })
    } catch (e: any) {
      setState({ busy: false, error: e.message })
    }
  }

  const doEStop = async () => {
    setState({ busy: true })
    try {
      const res = await api.estop()
      setState({ busy: false, message: res.message })
    } catch (e: any) {
      setState({ busy: false, error: e.message })
    }
  }

  return (
    <Card
      className="control-card"
      bordered
      hoverable
      title={
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title heading={4} style={{ margin: 0 }}>小车方向控制</Title>
          {state.busy && <Tag color="orange">执行中…</Tag>}
        </Space>
      }
    >
      {state.error && <Alert type="error" content={state.error} style={{ marginBottom: 12 }} />}
      {state.message && <Alert type="success" content={state.message} style={{ marginBottom: 12 }} />}

      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>速度</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Slider
                value={speed}
                min={0}
                max={1}
                step={0.05}
                onChange={(val) => {
                  const v = Array.isArray(val) ? Number(val[0]) : Number(val)
                  setSpeed(v)
                }}
                style={{ flex: 1 }}
              />
              <Tag color="orange">{speed.toFixed(2)}</Tag>
            </div>
          </Space>
        </Col>
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>时长 (ms，可选)</Text>
            <InputNumber
              value={durationMs}
              placeholder="如 800"
              min={0}
              max={10000}
              style={{ width: '100%' }}
              onChange={(v) => {
                if (typeof v === 'number') {
                  const clamped = Math.max(0, Math.min(10000, v))
                  setDurationMs(clamped)
                } else {
                  setDurationMs(undefined)
                }
              }}
            />
          </Space>
        </Col>
      </Row>

      <div className="dpad-grid" style={{ marginTop: 8, marginBottom: 12 }}>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('forward_left')}>斜向前左</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('forward')}>前进</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('forward_right')}>斜向前右</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('left')}>左移</Button></div>
        <div></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('right')}>右移</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('backward_left')}>斜向后左</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('backward')}>后退</Button></div>
        <div><Button type="primary" disabled={state.busy} onClick={() => doMove('backward_right')}>斜向后右</Button></div>
      </div>

      <Space>
        <Button type="default" disabled={state.busy} onClick={doStop}>停止</Button>
        <Button type="default" status="danger" disabled={state.busy} onClick={doEStop}>急停</Button>
      </Space>

      <Space wrap style={{ marginTop: 12 }}>
        <Button type="primary" disabled={state.busy} onClick={() => doMove('left')}>
          横向左移（x=0, y&gt;0）
        </Button>
        <Button type="primary" disabled={state.busy} onClick={() => doMove('right')}>
          横向右移（x=0, y&lt;0）
        </Button>
      </Space>
    </Card>
  )
}