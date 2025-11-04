import React, { useMemo, useState } from 'react'
import { modules } from './docsData'
import type { EndpointDoc } from './types'
import DocEndpointPage from './DocEndpointPage'

export default function DocsLayout() {
  const [selected, setSelected] = useState<EndpointDoc | null>(null)
  const all = useMemo(() => modules.flatMap((m) => m.endpoints), [])

  React.useEffect(() => {
    if (!selected && all.length) setSelected(all[0])
  }, [selected, all])

  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
      <aside style={{ borderRight: '1px solid #eee', paddingRight: 12 }}>
        <h3>API 目录</h3>
        {modules.map((m) => (
          <div key={m.id} style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600 }}>{m.title}</div>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {m.endpoints.map((ep) => (
                <li key={ep.id} style={{ marginTop: 6 }}>
                  <button
                    onClick={() => setSelected(ep)}
                    style={{
                      background: selected?.id === ep.id ? '#f1f5f9' : 'transparent',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    <code style={{ marginRight: 8 }}>{ep.method}</code>
                    {ep.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <div>
        {selected ? (
          <DocEndpointPage endpoint={selected} />
        ) : (
          <div style={{ color: '#64748b' }}>请选择左侧的一个端点查看详情。</div>
        )}
      </div>
    </div>
  )
}