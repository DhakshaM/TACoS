// frontend/src/views/Playground.jsx
import { useState, useRef, useEffect } from 'react'

const TOK_COLORS = [
  'var(--tok-0)','var(--tok-1)','var(--tok-2)','var(--tok-3)',
  'var(--tok-4)','var(--tok-5)','var(--tok-6)','var(--tok-7)',
  'var(--tok-8)','var(--tok-9)','var(--tok-10)','var(--tok-11)',
]

// Replace the PRESETS constant at the top of Playground.jsx

const PRESETS_BY_LANG = {
  hindi: [
    { label: 'Simple',    text: 'भारत एक महान देश है।' },
    { label: 'Conjuncts', text: 'क्षमा करना बहुत कठिन है लेकिन न्यायपूर्ण कार्य है।' },
    { label: 'Complex',   text: 'हिन्दी भारत की राजभाषा है और यह देवनागरी लिपि में लिखी जाती है।' },
    { label: 'Long',      text: 'भारतीय संविधान में हिन्दी को राजभाषा का दर्जा दिया गया है जो पूरे देश में बोली और समझी जाती है।' },
  ],
  tamil: [
    { label: 'Simple',    text: 'தமிழ் மொழி அழகானது.' },
    { label: 'Conjunct',  text: 'க்ஷமை கேட்பது மிகவும் கஷ்டமான காரியம்.' },
    { label: 'Agglut.',   text: 'இந்தியா ஒரு பெரிய நாடு. இங்கு பல மொழிகள் பேசப்படுகின்றன.' },
    { label: 'Long',      text: 'தமிழ் மொழி உலகின் பழமையான மொழிகளில் ஒன்றாகும் மற்றும் தென்னிந்தியாவில் பரவலாக பேசப்படுகிறது.' },
  ],
  marathi: [
    { label: 'Simple',    text: 'मराठी ही महाराष्ट्राची राजभाषा आहे.' },
    { label: 'Conjunct',  text: 'क्षमा, ज्ञान आणि श्रद्धा या गुणांनी जीवन समृद्ध होते.' },
    { label: 'Agglut.',   text: 'मुलांशी बोलताना तो शांतपणे चर्चा करत राहिला.' },
    { label: 'Long',      text: 'महाराष्ट्रात मराठी भाषा अधिकृतपणे वापरली जाते आणि राजभाषा म्हणून तिचे संविधानात संरक्षण आहे; ती शिक्षण, प्रशासन आणि साहित्यात मोठ्या प्रमाणात वापरली जाते.' },
  ],
}

const METRIC_DEFS = {
  fertility:  { label: 'Fertility',  unit: 'tok/word', good: v => v < 2   ? 'good' : v < 4 ? 'mid' : 'bad' },
  nsl:        { label: 'NSL',        unit: 'tok/chr',  good: v => v < 0.3 ? 'good' : v < 0.6 ? 'mid' : 'bad' },
  cpt:        { label: 'CPT',        unit: 'chr/tok',  good: v => v > 2.5 ? 'good' : v > 1.5 ? 'mid' : 'bad' },
  pcw:        { label: 'PCW',        unit: 'frag',     good: v => v < 0.2 ? 'good' : v < 0.6 ? 'mid' : 'bad' },
  n_tokens:   { label: 'Tokens',     unit: '#',        good: () => 'mid'  },
}

function MetricBadge({ label, value, unit, quality }) {
  const colors = { good: 'var(--green)', mid: 'var(--amber)', bad: 'var(--red)' }
  const color  = colors[quality] || 'var(--text-1)'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 12px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-2)', border: `1px solid var(--border)`,
      minWidth: 72,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
        color, lineHeight: 1,
      }}>{typeof value === 'number' ? value.toFixed(value < 1 ? 4 : 3) : value}</span>
      <span style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <span style={{ fontSize: 9, color: 'var(--text-2)', opacity: 0.6 }}>{unit}</span>
    </div>
  )
}


function TokenSpans({ tokens, strategyKey }) {
  const colorMap = {}
  let ci = 0
  const colorFor = tok => {
    const bare = tok.replace(/^[▁Ġ]+/, '').replace(/^##/, '')
    const key  = bare || tok
    if (!(key in colorMap)) colorMap[key] = TOK_COLORS[ci++ % TOK_COLORS.length]
    return colorMap[key]
  }

  // Decode BBPE: convert the byte-level escaped chars back to readable Unicode
  const decodeBBPE = (toks) => {
    try {
      // HuggingFace ByteLevel uses a specific 256-char mapping
      // Ġ = space (0x20), other chars map to their byte values
      const byteMap = {}
      // Build reverse map: visible char → byte value
      // The ByteLevel alphabet maps bytes 0-255 to specific Unicode chars
      let n = 0
      const addRange = (start, end) => {
        for (let i = start; i <= end; i++) byteMap[String.fromCodePoint(i)] = i
      }
      // Printable ASCII that map to themselves
      addRange(0x21, 0x7E)
      addRange(0xA1, 0xAC)
      addRange(0xAE, 0xFF)
      // The rest map to 0x100+ range starting from Ā
      let extra = 0x100
      for (let b = 0; b < 256; b++) {
        const c = String.fromCodePoint(b)
        if (!(c in byteMap)) { byteMap[String.fromCodePoint(extra)] = b; extra++ }
      }
      byteMap['Ġ'] = 0x20  // space

      const bytes = []
      const joined = toks.join('')
      for (const ch of joined) {
        if (ch in byteMap) bytes.push(byteMap[ch])
      }
      return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
    } catch { return '(decode error)' }
  }

  const isBBPE    = strategyKey === 'bbpe'
  const decoded   = isBBPE ? decodeBBPE(tokens) : null

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 5, padding: '10px 14px',
        background: 'var(--bg-0)', borderRadius: decoded ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
        border: '1px solid var(--border)',
        borderBottom: decoded ? 'none' : '1px solid var(--border)',
        minHeight: 48,
      }}>
        {tokens.map((tok, i) => {
          const color   = colorFor(tok)
          const isCont  = tok.startsWith('##')
          const isSpace = tok.startsWith('▁') || tok.startsWith('Ġ')
          // Show the FULL token string including markers
          const display = tok

          return (
            <span key={i} title={`index: ${i}`} style={{
              fontFamily: 'var(--font-mono)', fontSize: 12,
              padding: '2px 7px', borderRadius: 'var(--radius-sm)',
              background: `${color}18`,
              border: `1px solid ${color}55`,
              borderLeft:  `1px solid ${color}55`,
              color, cursor: 'default',
              transition: 'background 0.1s',
              opacity: isBBPE ? 0.75 : 1,
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}35`}
              onMouseLeave={e => e.currentTarget.style.background = `${color}18`}
            >
              {display}
            </span>
          )
        })}
        {tokens.length === 0 && (
          <span style={{ color: 'var(--text-2)', fontStyle: 'italic', fontSize: 12 }}>—</span>
        )}
      </div>

      {/* BBPE decoded row */}
      {decoded && (
        <div style={{
          padding: '6px 14px',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderTop: '1px dashed var(--border-hi)',
          borderRadius: '0 0 var(--radius-md) var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-2)', textTransform: 'uppercase',
            letterSpacing: '0.12em', flexShrink: 0,
          }}>decoded</span>
          <span style={{
            fontFamily: 'var(--font-ui)', fontSize: 14,
            color: 'var(--cyan)',
          }}>{decoded}</span>
        </div>
      )}
    </div>
  )
}

export default function Playground({ result, loading, error, strategies, language, onSubmit }) {
  const PRESETS = PRESETS_BY_LANG[language] || PRESETS_BY_LANG.hindi
  const [text, setText] = useState(PRESETS[0].text)

  // Also add language to the useEffect dependency so presets reset on language switch:
  useEffect(() => {
    const newPresets = PRESETS_BY_LANG[language] || PRESETS_BY_LANG.hindi
    setText(newPresets[0].text)
    onSubmit(newPresets[0].text)
  }, [language])
  const debounceRef = useRef(null)

  const handleChange = val => {
    setText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSubmit(val), 400)
  }

  useEffect(() => { onSubmit(text) }, [language]) // re-run when language changes

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* ── Left panel: input + metrics ── */}
      <div style={{
        width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-1)',
      }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8,
          }}>Input Text</div>
          <textarea
            value={text}
            onChange={e => handleChange(e.target.value)}
            rows={5}
            style={{
              width: '100%', resize: 'vertical',
              background: 'var(--bg-0)', border: '1px solid var(--border-hi)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-0)',
              padding: '10px 12px', fontSize: 15,
              outline: 'none', transition: 'border 0.2s',
              fontFamily: 'var(--font-ui)',
            }}
            onFocus={e  => e.target.style.borderColor = 'var(--amber)'}
            onBlur={e   => e.target.style.borderColor = 'var(--border-hi)'}
            placeholder="Type Indic text here…"
          />
          {/* presets */}
          <div style={{ display:'flex', flexWrap:'wrap', gap: 5, marginTop: 10 }}>
            {PRESETS.map(p => (
              <button key={p.label}
                onClick={() => handleChange(p.text)}
                style={{
                  padding: '3px 10px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  fontSize: 11, color: 'var(--text-1)',
                  fontFamily: 'var(--font-mono)',
                  background: text === p.text ? 'var(--amber-dim)' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* strategy metric strips */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px 20px',
          display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16,
        }}>
          {/* Add this label */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>Live metrics — this input only</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--cyan-dim)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '2px 6px', border: '1px solid var(--cyan-dim)',
              borderRadius: 3,
            }}>≠ corpus avg</span>
          </div>
          {result && strategies.map(s => {
            const m = result.metrics?.[s.key]
            if (!m) return null
            return (
              <div key={s.key} style={{
                background: 'var(--bg-2)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', padding: '10px 12px',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 8,
                }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--amber)', fontWeight:700 }}>
                    {s.label}
                  </span>
                  <span style={{
                    fontFamily:'var(--font-mono)', fontSize:11,
                    color:'var(--text-2)', background:'var(--bg-0)',
                    padding:'1px 7px', borderRadius:10,
                  }}>
                    {m.n_tokens} tokens
                  </span>
                </div>
                <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
                  {Object.entries(METRIC_DEFS).filter(([k]) => k !== 'n_tokens').map(([k, def]) => (
                    <MetricBadge key={k}
                      label={def.label} value={m[k]} unit={def.unit}
                      quality={def.good(m[k])}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {loading && !result && (
            <div style={{ color:'var(--text-2)', fontFamily:'var(--font-mono)', fontSize:12, textAlign:'center', marginTop:20 }}>
              tokenizing…
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: token spans grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <div style={{
          fontSize: 10, fontFamily:'var(--font-mono)', color:'var(--text-2)',
          letterSpacing:'0.15em', textTransform:'uppercase', marginBottom: 18,
        }}>Token Spans — All Strategies</div>

        <div style={{ display:'flex', flexDirection:'column', gap: 18 }}>
          {strategies.map(s => {
            const tokens = result?.tokens?.[s.key] ?? []
            return (
              <div key={s.key} style={{
                display:'grid', gridTemplateColumns:'100px 1fr',
                gap: 12, alignItems: 'start',
              }}>
                <div style={{ paddingTop: 10 }}>
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700,
                    color:'var(--text-0)',
                  }}>{s.label}</div>
                  <div style={{
                    fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-2)',
                    marginTop: 2,
                  }}>{tokens.length} tok</div>
                </div>
                <TokenSpans tokens={tokens} strategyKey={s.key} />
              </div>
            )
          })}
        </div>

        {error && (
          <div style={{
            marginTop: 20, padding: '12px 16px', borderRadius:'var(--radius-md)',
            background:'#2d1010', border:'1px solid var(--red)', color:'var(--red)',
            fontFamily:'var(--font-mono)', fontSize:12,
          }}>⚠ {error}</div>
        )}
      </div>
    </div>
  )
}