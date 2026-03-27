// frontend/src/views/Diff.jsx
import { useState, useEffect, useRef } from 'react'

const PRESETS_BY_LANG = {
  hindi: [
    { label: 'Simple',  text: 'भारत एक महान देश है।' },
    { label: 'Complex', text: 'राजभाषा हिन्दी में क्षमा और करुणा के भाव निहित हैं।' },
  ],
  tamil: [
    { label: 'Simple',  text: 'தமிழ் மொழி அழகானது.' },
    { label: 'Agglut.', text: 'பேசப்படுகின்றன என்பது ஒரு நீண்ட சொல்.' },
  ],
  marathi: [
    { label: 'Simple',  text: 'मराठी ही महाराष्ट्राची राजभाषा आहे.' },
  ],
}


// Compute pairwise agreement: for each whitespace word, which strategies agree on
// how to tokenize it (i.e. produce the same number of sub-tokens)
function buildDiffTable(text, result) {
  if (!result) return []
  const words    = text.trim().split(/\s+/)
  const keys     = Object.keys(result.tokens)

  return words.map(word => {
    const row = { word, strategies: {} }
    keys.forEach(key => {
      // naive: count tokens that are "from" this word by string containment
      const toks = result.tokens[key]
      const bare = w => w.replace(/^[▁Ġ#]+/, '')
      const matched = toks.filter(t => {
        const b = bare(t)
        return b.length > 0 && word.includes(b)
      })
      row.strategies[key] = matched.length === 0 ? [word] : matched
    })

    // disagreement: strategies differ in token count for this word
    const counts = keys.map(k => row.strategies[k].length)
    row.maxCount = Math.max(...counts)
    row.minCount = Math.min(...counts)
    row.disagree  = row.maxCount !== row.minCount
    return row
  })
}

export default function Diff({ result, strategies, language, onSubmit, loading }) {
  const PRESETS = PRESETS_BY_LANG[language] || PRESETS_BY_LANG.hindi
  const [text, setText] = useState(PRESETS[0].text)

  useEffect(() => {
    const newPresets = PRESETS_BY_LANG[language] || PRESETS_BY_LANG.hindi
    setText(newPresets[0].text)
    onSubmit(newPresets[0].text)
  }, [language])
  const debounceRef       = useRef(null)

  const handleChange = val => {
    setText(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSubmit(val), 400)
  }

  useEffect(() => { onSubmit(text) }, [language])

  const rows = buildDiffTable(text, result)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* input bar */}
      <div style={{
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)', display:'flex', gap:12, alignItems:'center', flexShrink:0,
      }}>
        <input
          value={text} onChange={e => handleChange(e.target.value)}
          style={{
            flex:1, background:'var(--bg-0)', border:'1px solid var(--border-hi)',
            borderRadius:'var(--radius-md)', color:'var(--text-0)',
            padding:'9px 14px', fontSize:14, outline:'none',
          }}
          onFocus={e  => e.target.style.borderColor = 'var(--amber)'}
          onBlur={e   => e.target.style.borderColor = 'var(--border-hi)'}
          placeholder="Enter text to compare…"
        />
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => handleChange(p.text)} style={{
            padding:'6px 14px', borderRadius:'var(--radius-sm)', fontSize:11,
            fontFamily:'var(--font-mono)', border:'1px solid var(--border)',
            color:'var(--text-1)', background: text === p.text ? 'var(--amber-dim)' : 'transparent',
          }}>{p.label}</button>
        ))}
      </div>

      {/* legend */}
      <div style={{
        padding: '10px 28px', borderBottom: '1px solid var(--border)',
        display:'flex', gap:20, alignItems:'center', flexShrink:0,
        background:'var(--bg-1)',
      }}>
        <span style={{ fontSize:11, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>
          Legend:
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-1)' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'#f0a83218', border:'1px solid var(--amber)', display:'inline-block' }} />
          Disagreement (strategies split differently)
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-1)' }}>
          <span style={{ width:10, height:10, borderRadius:2, background:'var(--bg-3)', border:'1px solid var(--border)', display:'inline-block' }} />
          Agreement
        </span>
      </div>

      {/* table */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>
        <table style={{ width:'100%', borderCollapse:'separate', borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th style={{
                textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10,
                color:'var(--text-2)', letterSpacing:'0.12em', textTransform:'uppercase',
                paddingBottom: 10, paddingLeft: 12,
              }}>Word</th>
              {strategies.map(s => (
                <th key={s.key} style={{
                  textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10,
                  color:'var(--amber)', letterSpacing:'0.12em', textTransform:'uppercase',
                  paddingBottom: 10, paddingLeft: 8,
                }}>{s.abbr}</th>
              ))}
              <th style={{
                textAlign:'center', fontFamily:'var(--font-mono)', fontSize:10,
                color:'var(--text-2)', letterSpacing:'0.12em', textTransform:'uppercase',
                paddingBottom: 10,
              }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{
                background: row.disagree ? '#f0a83210' : 'var(--bg-2)',
                borderRadius: 'var(--radius-sm)',
                transition: 'background 0.15s',
              }}>
                {/* word */}
                <td style={{
                  padding:'8px 12px', borderRadius:'var(--radius-sm) 0 0 var(--radius-sm)',
                  border:`1px solid ${row.disagree ? '#f0a83235' : 'var(--border)'}`,
                  borderRight:'none',
                  fontFamily:'var(--font-mono)', fontSize:14, color:'var(--text-0)', fontWeight:500,
                }}>
                  {row.word}
                </td>
                {/* per-strategy tokens */}
                {strategies.map(s => {
                  const toks  = row.strategies[s.key] || []
                  const count = toks.length
                  const worst = count === row.maxCount && row.disagree
                  return (
                    <td key={s.key} style={{
                      padding:'8px 8px',
                      border:`1px solid ${row.disagree ? '#f0a83235' : 'var(--border)'}`,
                      borderLeft:'none', borderRight:'none',
                    }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                        {toks.map((t, j) => (
                          <span key={j} style={{
                            fontFamily:'var(--font-mono)', fontSize:12,
                            padding:'1px 5px', borderRadius:3,
                            background: worst ? '#f0a83228' : 'var(--bg-0)',
                            border:`1px solid ${worst ? 'var(--amber)' : 'var(--border)'}`,
                            color: worst ? 'var(--amber)' : 'var(--text-1)',
                          }}>{t}</span>
                        ))}
                      </div>
                    </td>
                  )
                })}
                {/* delta */}
                <td style={{
                  padding:'8px 12px', textAlign:'center',
                  borderRadius:'0 var(--radius-sm) var(--radius-sm) 0',
                  border:`1px solid ${row.disagree ? '#f0a83235' : 'var(--border)'}`,
                  borderLeft:'none',
                  fontFamily:'var(--font-mono)', fontSize:12,
                  color: row.disagree ? 'var(--amber)' : 'var(--text-2)',
                  fontWeight: row.disagree ? 700 : 400,
                }}>
                  {row.disagree ? `+${row.maxCount - row.minCount}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!result && (
          <div style={{ textAlign:'center', color:'var(--text-2)', fontFamily:'var(--font-mono)', fontSize:12, marginTop:40 }}>
            {loading ? 'Tokenizing…' : 'Enter text above to see word-level comparison'}
          </div>
        )}
      </div>
    </div>
  )
}