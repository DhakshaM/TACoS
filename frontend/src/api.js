// frontend/src/api.js
const BASE = 'http://localhost:8000'

export async function tokenizeText(text, language = 'hindi') {
  const res = await fetch(`${BASE}/tokenize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCorpusMetrics(language = 'hindi') {
  const res = await fetch(`${BASE}/metrics/${language}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}