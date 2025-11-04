import React from 'react'
import type { EndpointDoc } from './types'
import CodeBlock from './CodeBlock'

export default function DocEndpointPage({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{endpoint.title}</h2>
      <div style={{ color: '#475569', marginBottom: 8 }}>{endpoint.summary}</div>

      <div className="card" style={{ padding: 12, marginTop: 8 }}>
        <b>Endpoint</b>
        <div style={{ marginTop: 8 }}>
          <code>{endpoint.method}</code>
          <code style={{ marginLeft: 8 }}>{endpoint.path}</code>
          {endpoint.stability && (
            <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
              稳定性：{endpoint.stability}
            </span>
          )}
        </div>
        {endpoint.rateLimit && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
            速率限制：{endpoint.rateLimit}
          </div>
        )}
      </div>

      {(endpoint.pathParams?.length || endpoint.queryParams?.length || endpoint.requestBody?.length) ? (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <b>请求参数</b>
          {endpoint.pathParams?.length ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>路径参数</div>
              {endpoint.pathParams.map((p) => (
                <div key={`path-${p.name}`} style={{ marginTop: 4 }}>
                  <code>{p.name}</code>
                  <small style={{ marginLeft: 8, color: '#64748b' }}>{p.type}{p.required ? ' · 必填' : ''}</small>
                  {p.description && <div style={{ color: '#475569' }}>{p.description}</div>}
                </div>
              ))}
            </div>
          ) : null}

          {endpoint.queryParams?.length ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>查询参数</div>
              {endpoint.queryParams.map((p) => (
                <div key={`query-${p.name}`} style={{ marginTop: 4 }}>
                  <code>{p.name}</code>
                  <small style={{ marginLeft: 8, color: '#64748b' }}>{p.type}{p.required ? ' · 必填' : ''}</small>
                  {p.description && <div style={{ color: '#475569' }}>{p.description}</div>}
                </div>
              ))}
            </div>
          ) : null}

          {endpoint.requestBody?.length ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>请求体</div>
              {endpoint.requestBody.map((f) => (
                <div key={`body-${f.name}`} style={{ marginTop: 4 }}>
                  <code>{f.name}</code>
                  <small style={{ marginLeft: 8, color: '#64748b' }}>{f.type}{f.required ? ' · 必填' : ''}</small>
                  {f.description && <div style={{ color: '#475569' }}>{f.description}</div>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {endpoint.responses?.length ? (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <b>响应</b>
          {endpoint.responses.map((r) => (
            <div key={`resp-${r.status}`} style={{ marginTop: 6 }}>
              <code>{r.status}</code>
              {r.contentType && (
                <small style={{ marginLeft: 8, color: '#64748b' }}>{r.contentType}</small>
              )}
              {r.description && <div style={{ color: '#475569' }}>{r.description}</div>}
              {typeof r.example !== 'undefined' && (
                <CodeBlock title="示例" code={typeof r.example === 'string' ? r.example : JSON.stringify(r.example, null, 2)} />
              )}
            </div>
          ))}
        </div>
      ) : null}

      {endpoint.examples?.length ? (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <b>代码示例</b>
          {endpoint.examples.map((ex, idx) => (
            <CodeBlock key={`ex-${idx}`} title={ex.title} code={ex.code} />
          ))}
        </div>
      ) : null}
    </div>
  )
}