// frontend/src/App.jsx
import { useState, useCallback, useEffect } from 'react'
import Playground from './views/Playground'
import Diff       from './views/Diff'
import Analysis   from './views/Analysis'
import { tokenizeText } from './api'

const VIEWS = ['Playground', 'Diff', 'Analysis']

const LANGUAGES = [
  { code: 'hindi',   label: 'Hindi',   script: 'हिन्दी' },
  { code: 'marathi', label: 'Marathi', script: 'मराठी'  },
  { code: 'tamil',   label: 'Tamil',   script: 'தமிழ்'  },
]

const STRATEGIES = [
  { key: 'whitespace', label: 'Whitespace', abbr: 'WS'  },
  { key: 'word',       label: 'Word',       abbr: 'WD'  },
  { key: 'character',  label: 'Character',  abbr: 'CH'  },
  { key: 'bpe',        label: 'BPE',        abbr: 'BP'  },
  { key: 'wordpiece',  label: 'WordPiece',  abbr: 'WP'  },
  { key: 'unigram',    label: 'Unigram',    abbr: 'UG'  },
  { key: 'bbpe',       label: 'Byte-BPE',   abbr: 'BB'  },
]

export default function App() {
  const [view, setView]           = useState('Playground')
  const [language, setLanguage]   = useState('hindi')
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const runTokenize = useCallback(async (text) => {
    if (!text.trim()) { setResult(null); return }
    setLoading(true); setError(null)
    try {
      const data = await tokenizeText(text, language)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [language])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      {/* ── Top bar ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 24,
        padding: '0 28px', height: 56,
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* wordmark */}
        <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginRight: 8 }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18,
            color: 'var(--amber)', letterSpacing: '-0.02em',
          }}>Tokenizer</span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-2)', letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>Explorer</span>
        </div>

        {/* nav */}
        <nav style={{ display:'flex', gap: 2 }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: '0.05em', transition: 'all 0.15s',
              background: view === v ? 'var(--amber)' : 'transparent',
              color:      view === v ? '#000' : 'var(--text-1)',
              fontWeight: view === v ? 700 : 400,
            }}>{v}</button>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* language selector */}
        <div style={{ display:'flex', gap: 4 }}>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setLanguage(l.code)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              border: `1px solid ${language === l.code ? 'var(--cyan)' : 'var(--border)'}`,
              background: language === l.code ? 'var(--cyan-dim)' : 'transparent',
              color:      language === l.code ? 'var(--cyan)'  : 'var(--text-2)',
              transition: 'all 0.15s',
            }}>
              <span style={{ marginRight: 5 }}>{l.script}</span>
              <span style={{ opacity: 0.6 }}>{l.label}</span>
            </button>
          ))}
        </div>

        {/* status dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: loading ? 'var(--amber)' : error ? 'var(--red)' : 'var(--green)',
          boxShadow: `0 0 8px ${loading ? 'var(--amber)' : error ? 'var(--red)' : 'var(--green)'}`,
          transition: 'all 0.3s',
        }} title={error || (loading ? 'processing…' : 'ready')} />
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {view === 'Playground' && (
          <Playground
            result={result} loading={loading} error={error}
            strategies={STRATEGIES} language={language}
            onSubmit={runTokenize}
          />
        )}
        {view === 'Diff' && (
          <Diff
            result={result} strategies={STRATEGIES} language={language}
            onSubmit={runTokenize} loading={loading}
          />
        )}
        {view === 'Analysis' && (
          <Analysis language={language} liveResult={result} strategies={STRATEGIES} />
        )}
      </main>
    </div>
  )
}

export { STRATEGIES }