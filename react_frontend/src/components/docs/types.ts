export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ParamDef = {
  name: string
  type: 'string' | 'number' | 'boolean'
  required?: boolean
  description?: string
  example?: string | number | boolean
}

export type BodyField = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required?: boolean
  description?: string
  example?: any
}

export type ResponseDef = {
  status: number
  description?: string
  contentType?: string
  example?: any
}

export type ErrorDef = {
  code: string
  httpStatus?: number
  description?: string
}

export type CodeExample = {
  title?: string
  language: 'bash' | 'python' | 'javascript' | 'java'
  code: string
}

export type SDKMapping = {
  python?: string
  javascript?: string
  java?: string
}

export type EndpointDoc = {
  id: string
  module: string
  title: string
  method: HttpMethod
  path: string
  summary?: string
  stability?: 'stable' | 'beta' | 'experimental'
  rateLimit?: string
  changelog?: string[]
  pathParams?: ParamDef[]
  queryParams?: ParamDef[]
  requestBody?: BodyField[]
  responses?: ResponseDef[]
  errors?: ErrorDef[]
  examples?: CodeExample[]
  sdk?: SDKMapping
}

export type DocsModule = {
  id: string
  title: string
  description?: string
  endpoints: EndpointDoc[]
}