// frontend/src/views/Diff.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenizeText } from '../api'

const LANGUAGES = [
  { code: 'hindi', label: 'Hindi', script: 'हिन्दी' },
  { code: 'marathi', label: 'Marathi', script: 'मराठी' },
  { code: 'tamil', label: 'Tamil', script: 'தமிழ்' },
]

const LEFT_PRESETS = [
  { label: 'Old', text: 'साँच बराबरि तप नहीं, झूठ बराबर पाप। जाके हिरदै साँच है ताकै हृदय आप॥', lang: 'hindi' },
  { label: 'Old', text: 'मराठी ही महाराष्ट्राची राजभाषा आहे।', lang: 'marathi' },
  { label: 'Old', text: 'துன்புறூஉம் துவ்வாமை இல்லாகும் யார்மாட்டும் இன்புறூஉம் இன்சொ லவர்க்கு', lang: 'tamil' },
]

const RIGHT_PRESETS = [
  { label: 'New', text: 'सच्चाई के बराबर कोई तपस्या नहीं है, झूठ (मिथ्या आचरण) के बराबर कोई पाप कर्म नहीं है। जिसके हृदय में सच्चाई है उसी के हृदय में भगवान निवास करते हैं।', lang: 'hindi' },
  { label: 'New', text: 'मराठी एक प्राचीन भाषा आहे।', lang: 'marathi' },
  { label: 'New', text: 'யாரிடத்திலும்‌ இன்புறத்தக்க இன்சொல்‌ வழங்குவோர்க்குத்‌ துன்பத்தை மிகுதிப்படுத்தும்‌ வறுமை என்பது இல்லையாகும்‌.', lang: 'tamil' },
]

function TokenChips({ tokens, compareTo }) {
  const a = tokens ?? []
  const b = compareTo ?? []
  const n = Math.max(a.length, b.length)
  if (n === 0) {
    return <span style={{ color: 'var(--text-2)', fontStyle: 'italic' }}>—</span>
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {Array.from({ length: n }, (_, i) => {
        const tok = a[i]
        const other = b[i]
        const same = tok != null && other != null && tok === other
        const missing = tok == null
        const bg = missing ? 'transparent' : same ? '#4ade801a' : '#f0a8321a'
        const border = missing ? 'var(--border)' : same ? 'var(--green)' : 'var(--amber)'
        const color = missing ? 'var(--text-2)' : same ? 'var(--green)' : 'var(--amber)'
        return (
          <span
            key={i}
            title={`index ${i}${other != null ? ` · other: ${other}` : ''}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '2px 6px',
              borderRadius: 4,
              background: bg,
              border: `1px solid ${border}`,
              color,
            }}
          >
            {tok ?? '∅'}
          </span>
        )
      })}
    </div>
  )
}

export default function Diff({ strategies, defaultLanguage = 'hindi' }) {
  const [leftLang, setLeftLang] = useState(defaultLanguage)
  const [rightLang, setRightLang] = useState(defaultLanguage)
  const [leftText, setLeftText] = useState(LEFT_PRESETS[0].text)
  const [rightText, setRightText] = useState(RIGHT_PRESETS[0].text)

  const [leftResult, setLeftResult] = useState(null)
  const [rightResult, setRightResult] = useState(null)
  const [loadingLeft, setLoadingLeft] = useState(false)
  const [loadingRight, setLoadingRight] = useState(false)
  const [errorLeft, setErrorLeft] = useState(null)
  const [errorRight, setErrorRight] = useState(null)

  const debLeft = useRef(null)
  const debRight = useRef(null)

  useEffect(() => {
    setLeftLang(defaultLanguage)
    setRightLang(defaultLanguage)
  }, [defaultLanguage])

  const runLeft = async (t, lang) => {
    if (!t.trim()) {
      setLeftResult(null)
      setErrorLeft(null)
      setLoadingLeft(false)
      return
    }
    setLoadingLeft(true)
    setErrorLeft(null)
    try {
      const res = await tokenizeText(t, lang)
      setLeftResult(res)
    } catch (e) {
      setLeftResult(null)
      setErrorLeft(String(e?.message ?? e))
    } finally {
      setLoadingLeft(false)
    }
  }

  const runRight = async (t, lang) => {
    if (!t.trim()) {
      setRightResult(null)
      setErrorRight(null)
      setLoadingRight(false)
      return
    }
    setLoadingRight(true)
    setErrorRight(null)
    try {
      const res = await tokenizeText(t, lang)
      setRightResult(res)
    } catch (e) {
      setRightResult(null)
      setErrorRight(String(e?.message ?? e))
    } finally {
      setLoadingRight(false)
    }
  }

  useEffect(() => {
    clearTimeout(debLeft.current)
    debLeft.current = setTimeout(() => runLeft(leftText, leftLang), 350)
    return () => clearTimeout(debLeft.current)
  }, [leftText, leftLang])

  useEffect(() => {
    clearTimeout(debRight.current)
    debRight.current = setTimeout(() => runRight(rightText, rightLang), 350)
    return () => clearTimeout(debRight.current)
  }, [rightText, rightLang])

  const rows = useMemo(() => {
    return (strategies ?? []).map((s) => {
      const a = leftResult?.tokens?.[s.key] ?? []
      const b = rightResult?.tokens?.[s.key] ?? []
      return {
        key: s.key,
        label: s.label,
        abbr: s.abbr,
        left: a,
        right: b,
        delta: Math.abs((a?.length ?? 0) - (b?.length ?? 0)),
      }
    })
  }, [strategies, leftResult, rightResult])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Classic diff — tokenize two inputs (same or different languages)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* left */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>Left:</span>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLeftLang(l.code)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    border: `1px solid ${leftLang === l.code ? 'var(--cyan)' : 'var(--border)'}`,
                    background: leftLang === l.code ? 'var(--cyan-dim)' : 'transparent',
                    color: leftLang === l.code ? 'var(--cyan)' : 'var(--text-2)',
                  }}
                >
                  {l.script}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: loadingLeft ? 'var(--amber)' : 'var(--text-2)' }}>
                {loadingLeft ? 'tokenizing…' : (leftResult ? 'ready' : '')}
              </span>
            </div>
            <textarea
              value={leftText}
              onChange={(e) => setLeftText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                resize: 'vertical',
                background: 'var(--bg-0)',
                border: '1px solid var(--border-hi)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-0)',
                padding: '10px 12px',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-ui)',
              }}
              placeholder="Paste sentence A…"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {LEFT_PRESETS.filter(p => p.lang === leftLang).map((p) => (
                <button
                  key={`left-${p.lang}`}
                  onClick={() => setLeftText(p.text)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* right */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>Right:</span>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setRightLang(l.code)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    border: `1px solid ${rightLang === l.code ? 'var(--cyan)' : 'var(--border)'}`,
                    background: rightLang === l.code ? 'var(--cyan-dim)' : 'transparent',
                    color: rightLang === l.code ? 'var(--cyan)' : 'var(--text-2)',
                  }}
                >
                  {l.script}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: loadingRight ? 'var(--amber)' : 'var(--text-2)' }}>
                {loadingRight ? 'tokenizing…' : (rightResult ? 'ready' : '')}
              </span>
            </div>
            <textarea
              value={rightText}
              onChange={(e) => setRightText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                resize: 'vertical',
                background: 'var(--bg-0)',
                border: '1px solid var(--border-hi)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-0)',
                padding: '10px 12px',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-ui)',
              }}
              placeholder="Paste sentence B…"
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {RIGHT_PRESETS.filter(p => p.lang === rightLang).map((p) => (
                <button
                  key={`right-${p.lang}`}
                  onClick={() => setRightText(p.text)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-2)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>



        {(errorLeft || errorRight) && (
          <div style={{
            marginTop: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--red)',
            background: '#2d1010',
            color: 'var(--red)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
          }}>
            {errorLeft ? `Left error: ${errorLeft}` : null}
            {errorLeft && errorRight ? ' · ' : null}
            {errorRight ? `Right error: ${errorRight}` : null}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 28px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0 12px 10px 0', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Strategy</th>
              <th style={{ textAlign: 'left', padding: '0 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Left tokens</th>
              <th style={{ textAlign: 'left', padding: '0 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Right tokens</th>
              <th style={{ textAlign: 'center', padding: '0 0 10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ background: 'var(--bg-2)' }}>
                <td style={{
                  padding: '10px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--amber)',
                  whiteSpace: 'nowrap',
                  borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                  border: '1px solid var(--border)',
                  borderRight: 'none',
                }}>
                  {r.abbr}
                </td>
                <td style={{ padding: '10px 12px', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                  <TokenChips tokens={r.left} compareTo={r.right} />
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>{r.left.length} tok</div>
                </td>
                <td style={{ padding: '10px 12px', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                  <TokenChips tokens={r.right} compareTo={r.left} />
                  <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>{r.right.length} tok</div>
                </td>
                <td style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  borderLeft: 'none',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: r.delta ? 'var(--amber)' : 'var(--text-2)',
                  fontWeight: r.delta ? 700 : 400,
                }}>
                  {r.delta ? `±${r.delta}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}