async function get(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Request failed (${res.status}): ${path}`)
  return res.json()
}

function qs(params) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function getHealth() {
  return get('/api/v1/health')
}

export async function getDataStatus() {
  return get('/api/v1/data/status')
}

export async function getAiStatus() {
  return get('/api/v1/ai/status')
}

export async function getInvestigations(filters = {}) {
  return get(`/api/v1/investigations${qs(filters)}`)
}

export async function getInvestigation(investigationId) {
  const res = await fetch(`/api/v1/investigations/${encodeURIComponent(investigationId)}`)
  if (res.status === 404) throw new Error('Investigation not found.')
  if (!res.ok) throw new Error(`Analysis request failed: ${res.status}`)
  return res.json()
}

export async function sendChatMessage(message, history = [], investigationId = null) {
  const res = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      history: history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      investigation_id: investigationId,
    }),
  })
  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`)
  return res.json()
}

export async function getCustomerInvestigation(customerId) {
  return get(`/api/v1/customers/${encodeURIComponent(customerId)}/investigation`)
}

export async function getFindings(filters = {}) {
  return get(`/api/v1/risk/findings${qs(filters)}`)
}

export async function getEvidence(filters = {}) {
  return get(`/api/v1/evidence${qs(filters)}`)
}

export async function getTransactions(filters = {}) {
  return get(`/api/v1/transactions${qs(filters)}`)
}

export async function getTransaction(transactionId) {
  const res = await fetch(`/api/v1/transactions/${encodeURIComponent(transactionId)}`)
  if (res.status === 404) throw new Error('Transaction not found.')
  if (!res.ok) throw new Error(`Transaction request failed: ${res.status}`)
  return res.json()
}

export async function getCustomers() {
  return get('/api/v1/customers')
}

export async function getInvestigationAnalysis(investigationId, { refresh = false } = {}) {
  const res = await fetch(
    `/api/v1/investigations/${encodeURIComponent(investigationId)}/analysis${refresh ? '?refresh=true' : ''}`
  )
  if (res.status === 404) throw new Error('Investigation not found.')
  if (!res.ok) throw new Error(`Analysis request failed: ${res.status}`)
  return res.json()
}

export async function regenerateInvestigationAnalysis(investigationId) {
  const res = await fetch(
    `/api/v1/investigations/${encodeURIComponent(investigationId)}/analysis`,
    { method: 'POST' }
  )
  if (res.status === 404) throw new Error('Investigation not found.')
  if (!res.ok) throw new Error(`Analysis request failed: ${res.status}`)
  return res.json()
}
