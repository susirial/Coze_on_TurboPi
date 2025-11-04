import React, { useState } from 'react'

export default function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      {title && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{title}</div>}
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto' }}>
        <code>{code}</code>
      </pre>
      <button onClick={copy} style={{ position: 'absolute', top: 8, right: 8 }}>
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  )
}