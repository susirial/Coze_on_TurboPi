import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Grid,
  Input,
  Radio,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Empty,
} from '@arco-design/web-react'
import { api, type HealthData, type SystemStatus, type SuccessResponse } from '../lib/api'

const { Row, Col } = Grid
const { Title, Text } = Typography

type State = {
  loading: boolean
  error?: string
  health?: SuccessResponse<HealthData>
  status?: SuccessResponse<SystemStatus>
}

export default function MJServiceHub() {
  const [state, setState] = useState<State>({ loading: true })
  const [view, setView] = useState<'card' | 'table'>('card')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }))
    try {
      const [health, status] = await Promise.all([api.getHealth(), api.getStatus()])
      setState({ loading: false, health, status })
    } catch (e: any) {
      setState({ loading: false, error: e.message })
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 10_000)
    return () => clearInterval(timer)
  }, [])

  const health = state.health?.data
  const status = state.status?.data

  const humanTime = (ts?: number | string) => {
    try {
      const d = typeof ts === 'number' ? new Date(ts) : new Date(ts || '')
      return d.toLocaleString()
    } catch {
      return ts ? String(ts) : '—'
    }
  }

  const tableData = useMemo(() => {
    if (!status) return []
    return [
      {
        key: 'service-row',
        service_name: status.service_name,
        port: status.port,
        runtime_mode: status.runtime_mode,
        healthy: health?.status ?? 'unknown',
        provider_available: health?.provider_available ? '是' : '否',
        car_state: status.car_state.status,
        last_command: status.car_state.last_command || '—',
        last_command_time: status.car_state.last_command_time
          ? humanTime(status.car_state.last_command_time)
          : '—',
      },
    ]
  }, [status, health])

  const columns = [
    { title: '服务', dataIndex: 'service_name' },
    { title: '端口', dataIndex: 'port' },
    { title: '运行模式', dataIndex: 'runtime_mode' },
    { title: '健康', dataIndex: 'healthy' },
    { title: '提供者可用', dataIndex: 'provider_available' },
    { title: '小车状态', dataIndex: 'car_state' },
    { title: '最近指令', dataIndex: 'last_command' },
    { title: '指令时间', dataIndex: 'last_command_time' },
    {
      title: '操作',
      dataIndex: 'action',
      render: () => (
        <Space>
          <Button type="primary" onClick={() => setDrawerOpen(true)}>详情</Button>
        </Space>
      ),
    },
  ]

  const healthItems = useMemo(() => {
    if (!health) return []
    return [
      {
        label: '状态',
        value: (
          <Tag color={health.status === 'healthy' ? 'green' : 'orange'}>{health.status}</Tag>
        ),
      },
      { label: '运行模式', value: <Tag color="orange">{health.runtime_mode}</Tag> },
      {
        label: '运行时初始化',
        value: health.runtime_initialized ? (
          <Tag color="green">是</Tag>
        ) : (
          <Tag color="orange">否</Tag>
        ),
      },
      {
        label: '提供者可用',
        value: health.provider_available ? (
          <Tag color="green">是</Tag>
        ) : (
          <Tag color="red">否</Tag>
        ),
      },
      { label: '启动时长', value: <Text>{(health.uptime_seconds / 60).toFixed(1)} 分钟</Text> },
      { label: '时间戳', value: <Text>{humanTime(health.timestamp)}</Text> },
    ]
  }, [health])

  const statusItems = useMemo(() => {
    if (!status) return []
    const items: { label: React.ReactNode; value: React.ReactNode }[] = [
      { label: '服务名', value: <Text>{status.service_name}</Text> },
      { label: '端口', value: <Text>{status.port}</Text> },
      { label: '运行模式', value: <Tag color="orange">{status.runtime_mode}</Tag> },
      { label: '小车状态', value: <Tag>{status.car_state.status}</Tag> },
    ]
    if (status.car_state.last_command) {
      items.push({ label: '最后指令', value: <Text>{status.car_state.last_command}</Text> })
    }
    if (status.car_state.last_command_time) {
      items.push({ label: '指令时间', value: <Text>{humanTime(status.car_state.last_command_time)}</Text> })
    }
    return items
  }, [status])

  const detailItems = useMemo(() => {
    if (!health || !status) return []
    const items: { label: React.ReactNode; value: React.ReactNode }[] = [
      { label: '服务名', value: status.service_name },
      { label: '端口', value: status.port },
      { label: '健康', value: health.status },
      { label: '运行模式', value: status.runtime_mode },
      { label: '运行时初始化', value: health.runtime_initialized ? '是' : '否' },
      { label: '提供者可用', value: health.provider_available ? '是' : '否' },
      { label: '启动时长', value: `${(health.uptime_seconds / 60).toFixed(1)} 分钟` },
      { label: '时间戳', value: humanTime(health.timestamp) },
      { label: '小车状态', value: status.car_state.status },
    ]
    if (status.car_state.last_command) {
      items.push({ label: '最后指令', value: status.car_state.last_command })
    }
    if (status.car_state.last_command_time) {
      items.push({ label: '指令时间', value: humanTime(status.car_state.last_command_time) })
    }
    return items
  }, [health, status])

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title heading={3} style={{ margin: 0 }}>扣子智能体 X TurboPi</Title>
        <Space>
          <Button onClick={load} disabled={state.loading}>{state.loading ? '刷新中…' : '刷新'}</Button>
        </Space>
      </Space>
      {/* 已移除顶部搜索与视图切换，保持界面简洁且避免溢出 */}

      {state.error && (
        <Result status="error" title={state.error} style={{ marginBottom: 16 }} />
      )}

      {state.loading && (
        <Spin tip="加载中…" style={{ width: '100%' }} />
      )}

      {!state.loading && !health && !status && (
        <Empty description="暂无服务状态数据" />
      )}

      {!state.loading && !!health && !!status && (
        <>
          {view === 'card' ? (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="健康概览" bordered hoverable>
                  <Descriptions layout="horizontal" column={2} style={{ marginTop: 8 }} data={healthItems} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="系统状态" bordered hoverable extra={<Button type="primary" onClick={() => setDrawerOpen(true)}>详情</Button>}>
                  <Descriptions layout="horizontal" column={2} style={{ marginTop: 8 }} data={statusItems} />
                </Card>
              </Col>
            </Row>
          ) : (
            <Card bordered hoverable>
              <Table columns={columns as any} data={tableData} pagination={false} />
            </Card>
          )}

          <Drawer
            width={560}
            visible={drawerOpen}
            onCancel={() => setDrawerOpen(false)}
            title="服务详情"
          >
            {!health || !status ? (
              <Empty description="暂无数据" />
            ) : (
              <Descriptions style={{ marginTop: 8 }} column={1} layout="horizontal" data={detailItems} />
            )}
          </Drawer>
        </>
      )}
    </div>
  )
}