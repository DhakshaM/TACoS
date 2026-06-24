// frontend/src/views/Energy.jsx
import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { getEnergy } from '../api'

// ── colour palette matching the rest of the app ──────────────────────────────
const EXP_COLORS = ['var(--tok-0)', 'var(--tok-1)', 'var(--tok-2)', 'var(--tok-3)']

// ── tooltip ───────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  color: 'var(--text-0)',
}

function EnergyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '10px 14px', minWidth: 200 }}>
      <div style={{ fontWeight: 700, color: 'var(--text-0)', marginBottom: 8 }}>
        {row.label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
        <Row label="CO₂-eq"      value={`${row.emissions_g.toFixed(4)} g`}   color="var(--green)" />
        <Row label="Energy"      value={`${(row.energy_kwh * 1000).toFixed(4)} Wh`} color="var(--cyan)" />
        <Row label="Runtime"     value={`${row.duration_s.toFixed(2)} s`}    color="var(--amber)" />
        {row.country  && <Row label="Country"  value={row.country}           color="var(--text-1)" />}
        {row.cpu_model && <Row label="CPU"     value={row.cpu_model}         color="var(--text-2)" />}
      </div>
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ── summary stat card (mirrors MetricBadge from Playground) ──────────────────
function StatCard({ label, value, unit, color = 'var(--cyan)' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '12px 18px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      minWidth: 110,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
        color, lineHeight: 1, letterSpacing: '-0.02em',
      }}>{value}</span>
      <span style={{
        fontSize: 9, color: 'var(--text-2)', marginTop: 5,
        textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>{label}</span>
      <span style={{ fontSize: 9, color: 'var(--text-2)', opacity: 0.6 }}>{unit}</span>
    </div>
  )
}

// ── horizontal bar chart (one bar per experiment) ────────────────────────────
function EmissionsChart({ rows }) {
  const data = rows.map((r, i) => ({
    ...r,
    color: EXP_COLORS[i % EXP_COLORS.length],
    name: r.label,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 52 + 40)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          horizontal={false}
        />
        <XAxis
          type="number"
          dataKey="emissions_g"
          unit=" g"
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-2)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={160}
          tick={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--text-1)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<EnergyTooltip />} cursor={{ fill: '#ffffff06' }} />
        <Bar dataKey="emissions_g" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((r, i) => (
            <Cell key={r.experiment_id} fill={r.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── no-data / setup instructions panel ───────────────────────────────────────
function SetupGuide() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      maxWidth: 620,
    }}>
      <p style={{ color: 'var(--text-1)', lineHeight: 1.7, fontSize: 13 }}>
        No <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: 12 }}>emissions.csv</span> found
        in <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-1)', fontSize: 12 }}>./emissions/</span>.
        Run CodeCarbon once per experiment stage to generate it, then reload this tab.
      </p>

      <Section title="1 · Install">
        <Code>pip install codecarbon</Code>
      </Section>

      <Section title="2 · Wrap each experiment stage">
        <Code>{`from codecarbon import EmissionsTracker

tracker = EmissionsTracker(
    project_name="indic_tokenizer_eval",
    experiment_id="evaluation_pipeline",   # change per stage
    output_dir="./emissions",
    country_iso_code="IND",
    log_level="warning",
)
tracker.start()

# --- your evaluation code here ---
# e.g. compute fertility, coverage, fragmentation index
# across all tokenizer-language pairs

tracker.stop()`}
        </Code>
      </Section>

      <Section title="Experiment IDs">
        <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <thead>
            <tr>
              {['Stage', 'experiment_id'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '6px 14px 6px 0',
                  color: 'var(--text-2)', letterSpacing: '0.1em',
                  textTransform: 'uppercase', fontSize: 9,
                  borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Evaluation pipeline',   'evaluation_pipeline'],
              ['Cross-lingual probing', 'crosslingual_probing'],
              ['Historical analysis',   'historical_analysis'],
            ].map(([stage, id]) => (
              <tr key={id}>
                <td style={{ padding: '7px 14px 7px 0', color: 'var(--text-1)' }}>{stage}</td>
                <td style={{ padding: '7px 0', color: 'var(--cyan)' }}>{id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="3 · Reload this tab after running">
        <p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.6 }}>
          CodeCarbon writes <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>emissions.csv</span> to
          {' '}<span style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>./emissions/</span> after each
          {' '}<span style={{ fontFamily: 'var(--font-mono)' }}>tracker.stop()</span> call.
          The backend reads it on every request — no restart needed.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
        textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  )
}

function Code({ children }) {
  return (
    <pre style={{
      margin: 0, padding: '12px 14px',
      background: 'var(--bg-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-mono)', fontSize: 11,
      color: 'var(--text-0)', overflowX: 'auto',
      lineHeight: 1.65, whiteSpace: 'pre',
    }}>{children}</pre>
  )
}

// ── main view ─────────────────────────────────────────────────────────────────
export default function Energy() {
  const [data,    setData]    = useState(null)   // null = loading
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getEnergy()
      .then(d  => { setData(d);  setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // ── aggregates ──────────────────────────────────────────────────────────────
  const rows    = data?.rows ?? []
  const csvFound = data?.csv_found ?? false

  const totalCO2     = rows.reduce((s, r) => s + r.emissions_g,              0)
  const totalWh      = rows.reduce((s, r) => s + r.energy_kwh * 1000,        0)
  const totalRuntime = rows.reduce((s, r) => s + r.duration_s,               0)

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── left sidebar ── */}
      <div style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-1)',
        padding: '20px 20px 24px',
        gap: 20,
        overflowY: 'auto',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
          textTransform: 'uppercase', letterSpacing: '0.15em',
        }}>Energy Utilisation</div>

        {/* summary cards */}
        {csvFound && rows.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatCard
                label="Total CO₂-eq"
                value={totalCO2 < 0.001 ? totalCO2.toExponential(2) : totalCO2.toFixed(4)}
                unit="grams"
                color="var(--green)"
              />
              <StatCard
                label="Energy"
                value={totalWh < 0.001 ? totalWh.toExponential(2) : totalWh.toFixed(4)}
                unit="watt-hours"
                color="var(--cyan)"
              />
              <StatCard
                label="Runtime"
                value={totalRuntime.toFixed(1)}
                unit="seconds"
                color="var(--amber)"
              />
            </div>

            {/* per-experiment legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2,
              }}>Experiments</div>
              {rows.map((r, i) => (
                <div key={r.experiment_id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                    background: EXP_COLORS[i % EXP_COLORS.length],
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--text-0)', fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{r.label}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)',
                      marginTop: 2,
                    }}>
                      {r.emissions_g.toFixed(4)} g CO₂ · {r.duration_s.toFixed(1)} s
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* methodology note */}
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6,
              fontFamily: 'var(--font-mono)',
            }}>
              Tracked via CodeCarbon using RAPL / psutil CPU sampling.
              Carbon intensity: India grid mix (IND).
              Each stage wrapped in a separate tracker instance.
            </div>
          </>
        ) : !loading && (
          <div style={{
            padding: '10px 12px', background: 'var(--bg-2)',
            border: '1px solid var(--border-hi)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)',
            lineHeight: 1.6,
          }}>
            No data yet — see setup guide →
          </div>
        )}

        {loading && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-2)', marginTop: 8,
          }}>loading…</div>
        )}
      </div>

      {/* ── main panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: '#2d1010', border: '1px solid var(--red)',
            color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12,
            marginBottom: 20,
          }}>⚠ {error}</div>
        )}

        {csvFound && rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* chart */}
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
                textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14,
              }}>CO₂-Equivalent per Experiment Stage (grams)</div>
              <div style={{
                background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '16px 12px 10px',
              }}>
                <EmissionsChart rows={rows} />
              </div>
            </div>

            {/* per-experiment detail table */}
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
                textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12,
              }}>Per-Stage Detail</div>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                <thead>
                  <tr>
                    {['Stage', 'CO₂ (g)', 'Energy (Wh)', 'Runtime (s)', 'CPU'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 12px 10px',
                        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-2)',
                        textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.experiment_id} style={{ background: 'var(--bg-2)' }}>
                      <td style={{
                        padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12,
                        fontWeight: 700, color: EXP_COLORS[i % EXP_COLORS.length],
                        borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                        border: '1px solid var(--border)', borderRight: 'none',
                      }}>{r.label}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        {r.emissions_g.toFixed(6)}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        {(r.energy_kwh * 1000).toFixed(6)}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)', border: '1px solid var(--border)', borderLeft: 'none', borderRight: 'none' }}>
                        {r.duration_s.toFixed(2)}
                      </td>
                      <td style={{
                        padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-2)',
                        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                        border: '1px solid var(--border)', borderLeft: 'none',
                        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{r.cpu_model || '—'}</td>
                    </tr>
                  ))}
                  {/* totals row */}
                  <tr style={{ background: 'var(--bg-3)' }}>
                    <td style={{
                      padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11,
                      fontWeight: 700, color: 'var(--text-1)',
                      borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
                      border: '1px solid var(--border-hi)', borderRight: 'none',
                    }}>TOTAL</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--green)', border: '1px solid var(--border-hi)', borderLeft: 'none', borderRight: 'none' }}>
                      {totalCO2.toFixed(6)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--cyan)', border: '1px solid var(--border-hi)', borderLeft: 'none', borderRight: 'none' }}>
                      {totalWh.toFixed(6)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--amber)', border: '1px solid var(--border-hi)', borderLeft: 'none', borderRight: 'none' }}>
                      {totalRuntime.toFixed(2)}
                    </td>
                    <td style={{
                      padding: '10px 12px',
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                      border: '1px solid var(--border-hi)', borderLeft: 'none',
                    }} />
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        ) : !loading && (
          <SetupGuide />
        )}
      </div>
    </div>
  )
}
