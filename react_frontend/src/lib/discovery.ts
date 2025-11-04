// 简易局域网服务发现工具
// 原理：优先探测 mDNS/常见主机名，再并发小范围扫描常见网段，
// 命中健康接口 `/status/health` 即认为后端可用。

const DEFAULT_PORT = 8000
const HEALTH_PATH = '/status/health'

async function probe(url: string, timeoutMs = 800): Promise<boolean> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
    })
    clearTimeout(t)
    return res.ok
  } catch {
    clearTimeout(t)
    return false
  }
}

function toBase(host: string, port = DEFAULT_PORT) {
  return `http://${host}:${port}`
}

export async function discoverBackend(): Promise<string | null> {
  // 1) 优先尝试常见主机名（mDNS/本机）
  const hostCandidates = [
    'turbopi.local',
    'raspberrypi.local',
    'localhost',
    '127.0.0.1',
  ]
  for (const host of hostCandidates) {
    const base = toBase(host)
    const ok = await probe(`${base}${HEALTH_PATH}`)
    if (ok) return base
  }

  // 2) 并发扫描常见网段的部分 IP（节流并发，范围有限）
  const prefixes = ['192.168.0', '192.168.1', '192.168.3', '10.0.0']
  const ips: string[] = []
  for (const p of prefixes) {
    const end = p === '192.168.3' ? 254 : 50
    for (let i = 2; i <= end; i++) {
      ips.push(`${p}.${i}`)
    }
  }

  const concurrency = 24
  let idx = 0
  let found: string | null = null

  async function worker() {
    while (idx < ips.length && !found) {
      const ip = ips[idx++]
      const base = toBase(ip)
      const ok = await probe(`${base}${HEALTH_PATH}`)
      if (ok) {
        found = base
        return
      }
    }
  }

  const tasks = Array.from({ length: concurrency }, () => worker())
  await Promise.all(tasks)
  return found
}