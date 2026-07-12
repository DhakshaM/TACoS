// frontend/src/views/Diff.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenizeText } from '../api'

const LANGUAGES = [
  { code: 'hindi', label: 'Hindi', script: 'हिन्दी' },
  { code: 'marathi', label: 'Marathi', script: 'मराठी' },
  { code: 'tamil', label: 'Tamil', script: 'தமிழ்' },
]

const LEFT_PRESETS = [
  { label: 'Old', text: 'मुला मुनारै क्या चढ़हि, अला न बहिरा होइ।\n\
जेहिं कारन तू बांग दे, सो दिल ही भीतरि जोइ॥\n\
नैनाँ अंतरि आव तूँ, ज्यूँ हौं नैन झँपेऊँ।\n\
नाँ हौं देखौं और कूँ, नाँ तुझ देखन देऊँ॥\n\
नर-नारी सब नरक है, जब लग देह सकाम।\n\
कहै कबीर ते राम के, जैं सुमिरैं निहकाम॥\n\
जेहि मारग गये पण्डिता, तेई गई बहीर।\n\
ऊँची घाटी राम की, तेहि चढ़ि रहै कबीर॥', lang: 'hindi' },
  { label: 'Old', text: 'वक्तृत्वा गोडपणें । अमृतातें पारुखें म्हणे ।\n\
रस होती वोळंगणें । अक्शरांसी ॥\n\
भावाचें अवतरण । अवतरविती खूण ।\n\
हाता चढे संपूर्ण । तत्त्वभेद ॥\n\
श्रीगुरूंचे पाय । जैं हृदय गिंवसूनि ठाय ।\n\
तैं येवढें भाग्य होय । उन्मेखासी ॥\n\
श्रीगुरूंचे पाय । जैं हृदय गिंवसूनि ठाय ।\n\
तैं येवढें भाग्य होय । उन्मेखासी ॥', lang: 'marathi' },
  { label: 'Old', text: 'இன்சொலால் ஈரம் அளைஇப் படிறுஇலவாம்\n\
செம்பொருள் கண்டார்வாய்ச் சொல்.\n\
அகன்அமர்ந்து ஈதலின் நன்றே முகனமர்ந்து\n\
இன்சொலன் ஆகப் பெறின்.\n\
முகத்தான் அமர்ந்துஇனிது நோக்கி அகத்தானாம்\n\
இன்சொ லினதே அறம்.\n\
துன்புறூஉம் துவ்வாமை இல்லாகும் யார்மாட்டும்\n\
இன்புறூஉம் இன்சொ லவர்க்கு.', lang: 'tamil' },
]

const RIGHT_PRESETS = [
  { label: 'New', text: 'हे मुल्ला! तू मीनार पर चढ़कर बाँग देता है, अल्लाह बहरा नहीं है।\n\
जिसके लिए तू बाँग देता है, उसे अपने दिल के भीतर देख।\n\
आत्मारूपी प्रियतमा कह रही है कि हे प्रियतम! तुम मेरे नेत्रों के भीतर आ जाओ।\n\
तुम्हारा नेत्रों में आगमन हाते ही, मैं अपने नेत्रों को बंद कर लूँगी या तुम्हें नेत्रों में बंद कर लूँगी।\n\
जिससे मैं न तो किसी को देख सकूँ और न तुम्हें किसी को देखने दूँ।', lang: 'hindi' },
  { label: 'New', text: 'वक्तृत्व आपल्या गोडपणाने अमृताला पलीकडे सर असे म्हणते व नवरस हे वक्तृत्वातील शब्दांची सेवा करतात ॥\n\
निरनिराळ्या तत्वातील फरक दाखवून अभिप्रायांची स्पष्टता करणारी जी मार्मिक खूण ती सर्वच्या सर्व आपल्या स्वाधीन होते. ॥\n\
जेव्हा हृदय श्रीगुरूचे पाय धरून रहाते तेव्हा ज्ञानाला एवढे दैव प्राप्त होते. ॥\n\
त्या श्रीगुरूच्या चरणांना आता नमस्कार करून (मी ज्ञानेश्वर, ग्रंथ सांगणे पुढे चालू करतो ते असे) तो ब्रह्मदेवाचा बाप व लक्ष्मीचा पती श्रीकृष्ण असे म्हणाला.', lang: 'marathi' },
  { label: 'New', text: 'அன்பு கலந்து வஞ்சம்‌ அற்றவைகளாகிய சொற்கள்‌, மெய்ப்பொருள்‌ கண்டவர்களின்‌ வாய்ச்சொற்கள்‌ இன்சொற்களாகும்‌.\n\
முகம்‌ மலர்ந்து இன்சொல்‌ உடையவனாக இருக்கப்‌ பெற்றால்‌, மனம்‌ மகிழ்ந்து பொருள்‌ கொடுக்கும்‌ ஈகையைவிட நல்லதாகும்‌.\n\
முகத்தால்‌ விரும்பி - இனிமையுடன்‌ நோக்கி - உள்ளம்‌ கலந்து இன்சொற்களைக்‌ கூறும்‌ தன்மையில்‌ உள்ளதே அறமாகும்‌.', lang: 'tamil' },
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

  // Compute diff metrics for each strategy
  const diffMetrics = useMemo(() => {
    if (!leftResult?.metrics || !rightResult?.metrics) return {}
    
    const result = {}
    const strategies_list = strategies ?? []
    
    for (const s of strategies_list) {
      const lm = leftResult.metrics[s.key]
      const rm = rightResult.metrics[s.key]
      if (!lm || !rm) continue
      
      const leftTokens = leftResult.tokens[s.key] ?? []
      const rightTokens = rightResult.tokens[s.key] ?? []
      
      // Token counts
      const leftTokenCount = leftTokens.length
      const rightTokenCount = rightTokens.length
      const tokenDelta = rightTokenCount - leftTokenCount
      
      // Vocabulary sizes
      const leftVocab = new Set(leftTokens).size
      const rightVocab = new Set(rightTokens).size
      const vocabDelta = rightVocab - leftVocab
      
      // Fertility change (%) - more intuitive
      const fertilityDiff = ((lm.fertility - rm.fertility) / (rm.fertility || 1)) * 100
      
      // PCW change (%) - percentage point change
      const pcwDiff = (lm.pcw - rm.pcw) * 100  // Convert to percentage points
      
      // Shared token overlap
      const leftSet = new Set(leftTokens)
      const rightSet = new Set(rightTokens)
      const overlap = new Set([...leftSet].filter(t => rightSet.has(t)))
      const overlapRatio = Math.max(leftSet.size, rightSet.size) > 0 
        ? overlap.size / Math.max(leftSet.size, rightSet.size)
        : 0
      
      // Compression retention
      const cptDiff = lm.cpt - rm.cpt
      
      // Sample tokens
      const sampleLeft = leftTokens.slice(0, 2)
      const sampleRight = rightTokens.slice(0, 2)
      
      result[s.key] = {
        leftTokenCount,
        rightTokenCount,
        tokenDelta,
        leftVocab,
        rightVocab,
        vocabDelta,
        fertilityDiff: fertilityDiff.toFixed(1),
        pcwDiff: pcwDiff.toFixed(1),
        overlapRatio: (overlapRatio * 100).toFixed(0),
        cptLeft: lm.cpt.toFixed(2),
        cptRight: rm.cpt.toFixed(2),
        cptDiff: cptDiff.toFixed(2),
        sampleLeft,
        sampleRight,
        leftFertility: lm.fertility.toFixed(2),
        rightFertility: rm.fertility.toFixed(2),
        leftPCW: (lm.pcw * 100).toFixed(1),
        rightPCW: (rm.pcw * 100).toFixed(1),
        oovLeft: (lm.oov_rate * 100).toFixed(1),
        oovRight: (rm.oov_rate * 100).toFixed(1),
      }
    }
    return result
  }, [leftResult, rightResult, strategies])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        flexShrink: 0,
      }}>
        {/* <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Diff - old vs new
        </div> */}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* left */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}></span>
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
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}></span>
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
        {/* Linguistics Metrics Comparison */}
        {Object.keys(diffMetrics).length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-2)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 14,
              fontWeight: 600,
            }}>
              Model Comparison
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 12px 10px 0', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Model</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Fertility</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>PCW</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>CPT</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>Fragmentation</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => {
                  const m = diffMetrics[s.key]
                  if (!m) return null
                  
                  const fertilityChange = parseFloat(m.fertilityDiff)
                  const pcwChange = parseFloat(m.pcwDiff)
                  const cptDiff = parseFloat(m.cptDiff)
                  
                  // Compute fragmented word counts
                  const leftWordCount = Math.round(m.leftTokenCount / parseFloat(m.leftFertility))
                  const rightWordCount = Math.round(m.rightTokenCount / parseFloat(m.rightFertility))
                  const leftFragCount = Math.round(leftWordCount * (parseFloat(m.leftPCW) / 100))
                  const rightFragCount = Math.round(rightWordCount * (parseFloat(m.rightPCW) / 100))
                  const fragChange = ((leftFragCount - rightFragCount) / (rightFragCount || 1)) * 100
                  
                  const getColor = (value) => {
                    const abs = Math.abs(value)
                    if (abs < 1) return 'var(--text-2)'
                    if (abs < 3) return 'var(--amber)'
                    return value > 0 ? 'var(--red)' : 'var(--green)'
                  }
                  
                  const MetricBar = ({ value, max = 100 }) => {
                    const pct = Math.min(Math.abs(value), max)
                    const isPos = value >= 0
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: '100%',
                          height: 8,
                          background: 'var(--bg-1)',
                          borderRadius: 3,
                          overflow: 'hidden',
                          position: 'relative',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: isPos ? 'var(--red)' : 'var(--green)',
                            transition: 'width 0.2s',
                          }} />
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: getColor(value) }}>
                          {isPos ? '+' : ''}{value.toFixed(1)}%
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <tr key={s.key} style={{ background: 'var(--bg-2)' }}>
                      <td style={{ padding: '14px 0', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--amber)', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)', border: '1px solid var(--border)', borderRight: 'none' }}>
                        {s.abbr}
                      </td>
                      
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, fontSize: 13 }}>
                          {m.leftFertility} → {m.rightFertility}
                        </div>
                        <MetricBar value={fertilityChange} max={50} />
                      </td>
                      
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, fontSize: 13 }}>
                          {m.leftPCW}% → {m.rightPCW}%
                        </div>
                        <MetricBar value={pcwChange} max={50} />
                      </td>
                      
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, fontSize: 13 }}>
                          {m.cptLeft} → {m.cptRight}
                        </div>
                        <MetricBar value={cptDiff} max={2} />
                      </td>
                      
                      <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: 12, border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, fontSize: 13 }}>
                          {leftFragCount} → {rightFragCount}
                        </div>
                        <MetricBar value={fragChange} max={50} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {/* <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', lineHeight: 2, background: 'var(--bg-1)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <div>🔴 Red = older text more complex · 🟢 Green = modern text more complex</div>
              <div>• <strong>Fertility</strong>: tokens-per-word ratio (how fragmented each text is)</div>
              <div>• <strong>PCW</strong>: % of words split into subwords (morphological complexity)</div>
              <div>• <strong>CPT</strong>: characters per token (tokenizer efficiency)</div>
              <div>• <strong>Fragmentation</strong>: count of words split into subwords (absolute complexity)</div>
            </div> */}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0 12px 10px 0', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Strategy</th>
              <th style={{ textAlign: 'left', padding: '0 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tokens</th>
              <th style={{ textAlign: 'left', padding: '0 12px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tokens</th>
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