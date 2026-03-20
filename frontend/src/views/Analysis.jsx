// frontend/src/views/Analysis.jsx
import { useEffect, useState } from 'react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
} from 'recharts'
import { getCorpusMetrics } from '../api'
import { tokenizeText }    from '../api'

const METRICS_META = [
  { key:'fertility', label:'Fertility',  desc:'Tokens per word. Lower = more efficient.' },
  { key:'nsl',       label:'NSL',        desc:'Tokens per character. Compression proxy.' },
  { key:'cpt',       label:'CPT',        desc:'Chars per token. Higher = coarser tokens.' },
  { key:'pcw',       label:'PCW',        desc:'Fragmented word fraction. Lower = less splitting.' },
]

const STRATEGY_COLORS = {
  'Whitespace':             'var(--tok-0)',
  'Word (IndicNLP)':        'var(--tok-1)',
  'Character (Grapheme Clusters)': 'var(--tok-2)',
  'BPE':                    'var(--tok-3)',
  'WordPiece':              'var(--tok-4)',
  'Unigram LM':             'var(--tok-5)',
  'Byte-Level BPE':         'var(--tok-6)',
}
const STRATEGY_ABBR = {
  'Whitespace':'WS','Word (IndicNLP)':'WD',
  'Character (Grapheme Clusters)':'CH','BPE':'BP',
  'WordPiece':'WP','Unigram LM':'UG','Byte-Level BPE':'BB',
}

const LENGTH_PRESETS = [
  'भारत', 'भारत एक', 'भारत एक महान', 'भारत एक महान देश',
  'भारत एक महान देश है', 'भारत एक महान देश है।',
  'भारत एक महान और विविध देश है जहाँ अनेक भाषाएँ बोली जाती हैं।',
]

const CHART_TOOLTIP_STYLE = {
  background: '#111927', border: '1px solid #1e2d42',
  borderRadius: 8, fontFamily: 'JetBrains Mono, monospace',
  fontSize: 12, color: '#e8edf5',
}

export default function Analysis({ language, liveResult, strategies }) {
  const [corpusMetrics, setCorpusMetrics] = useState(null)
  const [sweepData, setSweepData]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [activeMetric, setActiveMetric]   = useState('fertility')

  useEffect(() => {
    setLoading(true)
    getCorpusMetrics(language)
      .then(setCorpusMetrics)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [language])

  // length sweep
  useEffect(() => {
    Promise.all(
      LENGTH_PRESETS.map(text =>
        tokenizeText(text, language).then(res => ({
          chars: text.length,
          words: text.trim().split(/\s+/).length,
          ...Object.fromEntries(
            Object.entries(res.tokens).map(([k, v]) => [k, v.length])
          ),
        }))
      )
    ).then(setSweepData).catch(console.error)
  }, [language])

  if (loading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100%', color:'var(--text-2)', fontFamily:'var(--font-mono)', fontSize:13,
    }}>Loading corpus metrics…</div>
  )

  if (!corpusMetrics) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100%', color:'var(--red)', fontFamily:'var(--font-mono)', fontSize:13,
    }}>Could not load corpus metrics for {language}.</div>
  )

  // ── bar chart data: each strategy as a bar ──
  const barData = METRICS_META.map(m => {
    const entry = { metric: m.label }
    corpusMetrics.forEach(s => {
      const abbr = STRATEGY_ABBR[s.strategy] || s.strategy.slice(0,4)
      // normalise to [0,1] for radar; raw for bar
      entry[abbr] = parseFloat((s[m.key] || 0).toFixed(4))
    })
    return entry
  })

  // ── radar data: one point per strategy ──
  const normalize = (key, val) => {
    const vals = corpusMetrics.map(s => s[key] || 0)
    const min  = Math.min(...vals), max = Math.max(...vals)
    return max === min ? 0.5 : (val - min) / (max - min)
  }
  const radarData = METRICS_META.map(m => {
    const entry = { metric: m.label }
    corpusMetrics.forEach(s => {
      const abbr = STRATEGY_ABBR[s.strategy] || s.strategy.slice(0,4)
      entry[abbr] = parseFloat(normalize(m.key, s[m.key] || 0).toFixed(3))
    })
    return entry
  })

  const strategyAbbrs = corpusMetrics.map(s => STRATEGY_ABBR[s.strategy] || s.strategy.slice(0,4))
  const colorList = ['#f0a832','#2dd4bf','#a78bfa','#f472b6','#4ade80','#60a5fa','#fb923c']

  return (
    <div style={{ height:'100%', overflowY:'auto', padding: '28px 32px' }}>
      <div style={{
        fontFamily:'var(--font-display)', fontSize:26, fontWeight:700,
        color:'var(--text-0)', marginBottom: 4,
        letterSpacing:'-0.02em',
      }}>
        Corpus Analysis
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:12, color:'var(--cyan)',
          marginLeft:14, fontWeight:400, letterSpacing:'0.08em',
        }}>{language.toUpperCase()}</span>
      </div>
      <div style={{ color:'var(--text-2)', fontSize:12, marginBottom:28 }}>
        Pre-computed metrics over ~105MB of IndicCorpV2 training corpus
      </div>

      {/* ── metric selector ── */}
      <div style={{ display:'flex', gap:6, marginBottom:24 }}>
        {METRICS_META.map(m => (
          <button key={m.key} onClick={() => setActiveMetric(m.key)} style={{
            padding:'6px 16px', borderRadius:'var(--radius-sm)',
            fontFamily:'var(--font-mono)', fontSize:11,
            border:`1px solid ${activeMetric === m.key ? 'var(--cyan)' : 'var(--border)'}`,
            background: activeMetric === m.key ? 'var(--cyan-dim)' : 'transparent',
            color: activeMetric === m.key ? 'var(--cyan)' : 'var(--text-1)',
            transition:'all 0.15s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* ── row 1: bar chart + radar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        {/* Bar chart for selected metric */}
        <div style={{
          background:'var(--bg-1)', borderRadius:'var(--radius-lg)',
          border:'1px solid var(--border)', padding:'20px',
        }}>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:11, color:'var(--amber)',
            letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16,
          }}>
            {METRICS_META.find(m => m.key === activeMetric)?.label} — All Strategies
          </div>
          <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:14 }}>
            {METRICS_META.find(m => m.key === activeMetric)?.desc}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={corpusMetrics.map(s => ({
                name: STRATEGY_ABBR[s.strategy] || s.strategy.slice(0,4),
                value: parseFloat((s[activeMetric] || 0).toFixed(4)),
                color: colorList[corpusMetrics.indexOf(s) % colorList.length],
              }))}
              margin={{ top:0, right:10, bottom:0, left:0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" vertical={false} />
              <XAxis dataKey="name" tick={{ fontFamily:'JetBrains Mono', fontSize:11, fill:'#8fa3bc' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily:'JetBrains Mono', fontSize:10, fill:'#4d6480' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill:'#ffffff08' }} />
              <Bar dataKey="value" radius={[4,4,0,0]}
                fill="var(--amber)"
                label={{ position:'top', fontFamily:'JetBrains Mono', fontSize:9, fill:'#8fa3bc' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar chart */}
        <div style={{
          background:'var(--bg-1)', borderRadius:'var(--radius-lg)',
          border:'1px solid var(--border)', padding:'20px',
        }}>
          <div style={{
            fontFamily:'var(--font-mono)', fontSize:11, color:'var(--amber)',
            letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16,
          }}>Strategy Profile Radar (normalised)</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top:10, right:20, bottom:10, left:20 }}>
              <PolarGrid stroke="#1e2d42" />
              <PolarAngleAxis dataKey="metric"
                tick={{ fontFamily:'JetBrains Mono', fontSize:11, fill:'#8fa3bc' }} />
              {strategyAbbrs.map((abbr, i) => (
                <Radar key={abbr} name={abbr} dataKey={abbr}
                  stroke={colorList[i]} fill={colorList[i]} fillOpacity={0.1}
                  strokeWidth={1.5} dot={{ r:3, fill:colorList[i] }}
                />
              ))}
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontFamily:'JetBrains Mono', fontSize:10, color:'#8fa3bc' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── row 2: length sweep ── */}
      <div style={{
        background:'var(--bg-1)', borderRadius:'var(--radius-lg)',
        border:'1px solid var(--border)', padding:'20px', marginBottom:20,
      }}>
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:11, color:'var(--amber)',
          letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6,
        }}>Token Count vs Input Length (Length Sweep)</div>
        <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:16 }}>
          How each strategy's token count grows as input text gets longer.
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={sweepData} margin={{ top:0, right:20, bottom:0, left:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d42" />
            <XAxis dataKey="words" label={{ value:'words', position:'insideBottom', offset:-2, fill:'#4d6480', fontSize:10 }}
              tick={{ fontFamily:'JetBrains Mono', fontSize:10, fill:'#4d6480' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily:'JetBrains Mono', fontSize:10, fill:'#4d6480' }} axisLine={false} tickLine={false} width={35} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontFamily:'JetBrains Mono', fontSize:10 }} />
            {['whitespace','word','character','bpe','wordpiece','unigram','bbpe'].map((k,i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colorList[i]}
                strokeWidth={1.5} dot={{ r:3 }} name={k} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── row 3: summary stats table ── */}
      <div style={{
        background:'var(--bg-1)', borderRadius:'var(--radius-lg)',
        border:'1px solid var(--border)', padding:'20px',
      }}>
        <div style={{
          fontFamily:'var(--font-mono)', fontSize:11, color:'var(--amber)',
          letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16,
        }}>Full Metrics Table</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 3px' }}>
            <thead>
              <tr>
                {['Strategy','Fertility','OOV','NSL','CPT','PCW','Vocab','Tokens'].map(h => (
                  <th key={h} style={{
                    textAlign:'left', fontFamily:'var(--font-mono)', fontSize:10,
                    color:'var(--text-2)', letterSpacing:'0.1em', textTransform:'uppercase',
                    padding:'0 12px 10px', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corpusMetrics.map((s, i) => (
                <tr key={i} style={{ background:'var(--bg-2)' }}>
                  {[
                    <td key="s" style={{
                      padding:'9px 12px', borderRadius:'var(--radius-sm) 0 0 var(--radius-sm)',
                      fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700,
                      color:colorList[i], whiteSpace:'nowrap',
                    }}>
                      {STRATEGY_ABBR[s.strategy] || s.strategy}
                    </td>,
                    ...['fertility','oov_rate','nsl','cpt','pcw'].map(k => (
                      <td key={k} style={{
                        padding:'9px 12px',
                        fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-1)',
                      }}>{(s[k]||0).toFixed(4)}</td>
                    )),
                    <td key="vs" style={{
                      padding:'9px 12px',
                      fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-1)',
                    }}>{(s.vocab_size||0).toLocaleString()}</td>,
                    <td key="tt" style={{
                      padding:'9px 12px', borderRadius:'0 var(--radius-sm) var(--radius-sm) 0',
                      fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-1)',
                    }}>{(s.total_tokens||0).toLocaleString()}</td>,
                  ]}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
