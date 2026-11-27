import { useEffect, useRef, useState } from 'react'
import {
  DATAPATH_STAGES,
  DIE_BLOCKS,
  GPU_TILES,
  NODE_OPTIONS,
  SANDBOX_DEFAULTS,
  SANDBOX_RANGES,
  ZOOM_LEVELS,
  dynamicPowerWatts,
  leakagePowerWatts,
  transistorDensity,
} from './data/chipDesign.js'

const TABS = [
  { id: 'explore', label: 'Explore the die', hint: 'Hover the floorplan blocks' },
  { id: 'datapath', label: 'Live datapath', hint: 'Watch a clock cycle run' },
  { id: 'sandbox', label: 'Design sandbox', hint: 'Balance CPU vs GPU' },
]

function blockById(id) {
  return DIE_BLOCKS.find((block) => block.id === id)
}

function ZoomScene({ level }) {
  const green = '#76B900'
  if (level === 'package') {
    return (
      <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="Chip package">
        <rect x="60" y="30" width="200" height="140" rx="10" className="zoom-package-body" />
        <rect x="120" y="70" width="80" height="60" rx="4" className="zoom-die" />
        {Array.from({ length: 9 }, (_, i) => <rect key={`t${i}`} x={80 + i * 18} y="14" width="8" height="12" className="zoom-pin" />)}
        {Array.from({ length: 9 }, (_, i) => <rect key={`b${i}`} x={80 + i * 18} y="174" width="8" height="12" className="zoom-pin" />)}
        {Array.from({ length: 5 }, (_, i) => <rect key={`l${i}`} x="44" y={50 + i * 22} width="12" height="8" className="zoom-pin" />)}
        {Array.from({ length: 5 }, (_, i) => <rect key={`r${i}`} x="264" y={50 + i * 22} width="12" height="8" className="zoom-pin" />)}
        <text x="160" y="104" textAnchor="middle" fill={green} fontSize="12" fontFamily="monospace">DIE</text>
      </svg>
    )
  }
  if (level === 'die') {
    return (
      <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="Silicon die floorplan">
        <rect x="30" y="15" width="260" height="170" rx="6" className="zoom-die" />
        {DIE_BLOCKS.map((block) => {
          const s = 260 / 480
          return <rect key={block.id} x={30 + (block.rect.x - 120) * s} y={15 + (block.rect.y - 90) * s} width={block.rect.w * s} height={block.rect.h * s} className="zoom-block" />
        })}
      </svg>
    )
  }
  if (level === 'block') {
    return (
      <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="Gate array inside one block">
        <rect x="30" y="15" width="260" height="170" rx="6" className="zoom-die" />
        {Array.from({ length: 8 }, (_, r) => Array.from({ length: 12 }, (_, c) => (
          <rect key={`${r}-${c}`} x={44 + c * 20} y={28 + r * 20} width="14" height="14" className="zoom-gate" />
        )))}
      </svg>
    )
  }
  if (level === 'gate') {
    return (
      <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="CMOS NAND gate circuit">
        <line x1="20" y1="60" x2="60" y2="60" className="zoom-wire" /><text x="10" y="64" fill="#C0C1C7" fontSize="11">A</text>
        <line x1="20" y1="120" x2="60" y2="120" className="zoom-wire" /><text x="10" y="124" fill="#C0C1C7" fontSize="11">B</text>
        <rect x="80" y="20" width="160" height="160" rx="6" className="zoom-die" opacity="0.35" />
        <line x1="160" y1="30" x2="160" y2="50" className="zoom-wire" /><text x="166" y="36" fill="#8AE600" fontSize="9">VDD</text>
        <circle cx="120" cy="58" r="14" className="zoom-fet" /><line x1="120" y1="72" x2="120" y2="90" className="zoom-wire" /><line x1="60" y1="60" x2="106" y2="60" className="zoom-wire" />
        <circle cx="200" cy="58" r="14" className="zoom-fet" /><line x1="200" y1="72" x2="200" y2="90" className="zoom-wire" /><line x1="60" y1="60" x2="186" y2="58" className="zoom-wire" opacity="0.5" />
        <line x1="120" y1="90" x2="120" y2="105" x2="290" y2="105" className="zoom-wire" /><line x1="200" y1="90" x2="200" y2="105" x2="290" y2="105" className="zoom-wire" /><text x="292" y="109" fill={green} fontSize="11">Y</text>
        <circle cx="140" cy="128" r="14" className="zoom-fet" /><line x1="140" y1="114" x2="140" y2="105" className="zoom-wire" /><line x1="140" y1="142" x2="140" y2="158" className="zoom-wire" /><line x1="60" y1="60" x2="70" y2="60" x2="70" y2="128" x2="126" y2="128" className="zoom-wire" opacity="0.5" />
        <circle cx="180" cy="150" r="14" className="zoom-fet" /><line x1="140" y1="158" x2="180" y2="158" x2="180" y2="164" className="zoom-wire" /><line x1="60" y1="120" x2="166" y2="120" x2="166" y2="150" className="zoom-wire" opacity="0.5" />
        <line x1="180" y1="164" x2="180" y2="182" className="zoom-wire" /><line x1="172" y1="182" x2="188" y2="182" className="zoom-wire" /><text x="192" y="186" fill="#8AE600" fontSize="9">GND</text>
      </svg>
    )
  }
  if (level === 'transistor') {
    return (
      <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="MOSFET cross section">
        <rect x="30" y="100" width="260" height="80" rx="4" className="zoom-substrate" /><text x="160" y="170" textAnchor="middle" fill="#C0C1C7" fontSize="10">p-type silicon substrate</text>
        <rect x="55" y="100" width="55" height="40" rx="6" className="zoom-well" /><text x="82" y="124" textAnchor="middle" fill="#8AE600" fontSize="9">n+ source</text>
        <rect x="210" y="100" width="55" height="40" rx="6" className="zoom-well" /><text x="237" y="124" textAnchor="middle" fill="#8AE600" fontSize="9">n+ drain</text>
        <rect x="110" y="92" width="100" height="10" className="zoom-oxide" />
        <rect x="115" y="66" width="90" height="26" rx="3" className="zoom-gate-electrode" /><text x="160" y="83" textAnchor="middle" fill="#000" fontSize="10" fontWeight="700">GATE</text>
        <text x="160" y="105" textAnchor="middle" fill={green} fontSize="8">channel</text>
        <line x1="82" y1="60" x2="82" y2="100" className="zoom-wire" /><text x="66" y="55" fill="#C0C1C7" fontSize="9">SOURCE</text>
        <line x1="237" y1="60" x2="237" y2="100" className="zoom-wire" /><text x="226" y="55" fill="#C0C1C7" fontSize="9">DRAIN</text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 200" className="chip-zoom-scene" role="img" aria-label="P-N junction">
      <rect x="30" y="60" width="120" height="80" className="zoom-ptype" /><text x="90" y="105" textAnchor="middle" fill="#C0C1C7" fontSize="12">p-type</text>
      <rect x="190" y="60" width="100" height="80" className="zoom-ntype" /><text x="240" y="105" textAnchor="middle" fill="#C0C1C7" fontSize="12">n-type</text>
      <rect x="150" y="60" width="40" height="80" className="zoom-depletion" /><text x="170" y="52" textAnchor="middle" fill={green} fontSize="9">depletion region</text>
      {Array.from({ length: 6 }, (_, i) => <circle key={`h${i}`} cx={45 + i * 16} cy={75 + (i % 2) * 40} r="3" className="zoom-hole" />)}
      {Array.from({ length: 6 }, (_, i) => <circle key={`e${i}`} cx={200 + i * 14} cy={75 + (i % 2) * 40} r="3" className="zoom-electron" />)}
      <text x="160" y="165" textAnchor="middle" fill="#C0C1C7" fontSize="9">built-in field opposes diffusion — forward bias narrows it, reverse bias widens it</text>
    </svg>
  )
}

function DieExplorer({ onAskTutor }) {
  const [active, setActive] = useState(DIE_BLOCKS[3])
  const [zoom, setZoom] = useState('die')
  const zoomInfo = ZOOM_LEVELS.find((item) => item.id === zoom)
  return (
    <div className="chip-explore-grid">
      <section className="chip-die-card">
        <div className="chip-panel-heading"><div><p className="eyebrow">SILICON FLOORPLAN</p><h2>A CPU die, simplified</h2></div><span className="chip-die-hint">Hover or tap a block</span></div>
        <svg viewBox="0 0 720 460" className="chip-die-svg" role="img" aria-label="Stylized CPU die floorplan">
          <rect x="40" y="30" width="640" height="400" rx="18" className="chip-package" />
          <rect x="58" y="48" width="604" height="364" rx="12" className="chip-pin-ring" />
          <rect x="120" y="90" width="480" height="280" rx="8" className="chip-die" />
          {DIE_BLOCKS.map((block) => (
            <g key={block.id} onMouseEnter={() => setActive(block)} onClick={() => setActive(block)} className={`chip-block ${active.id === block.id ? 'active' : ''}`} tabIndex="0" role="button" aria-label={block.name} onFocus={() => setActive(block)}>
              <rect x={block.rect.x} y={block.rect.y} width={block.rect.w} height={block.rect.h} rx="6" className="chip-block-rect" />
              <text x={block.rect.x + block.rect.w / 2} y={block.rect.y + block.rect.h / 2 - 2} textAnchor="middle" className="chip-block-name">{block.name}</text>
              <text x={block.rect.x + block.rect.w / 2} y={block.rect.y + block.rect.h / 2 + 14} textAnchor="middle" className="chip-block-size">{block.transistors}</text>
            </g>
          ))}
          <text x="360" y="70" textAnchor="middle" className="chip-package-label">PACKAGE</text>
          <text x="360" y="398" textAnchor="middle" className="chip-package-label">ELECTRALAB · DIE 001</text>
        </svg>
      </section>
      <aside className="chip-spec-stack">
        <section className="chip-spec-card" key={active.id}>
          <p className="eyebrow">BLOCK INSPECTOR</p>
          <h3>{active.name}</h3>
          <p className="chip-spec-short">{active.short}</p>
          <div className="chip-spec-row"><span>Est. transistors</span><strong>{active.transistors}</strong></div>
          <div className="chip-spec-physics"><p className="eyebrow">PHYSICS INSIDE</p><p>{active.physics}</p></div>
          <button className="button button-subtle" onClick={() => onAskTutor(`Tell me more about the ${active.name} inside a CPU chip and the semiconductor physics it relies on.`)}>Ask the tutor about this block</button>
        </section>
        <section className="chip-zoom-card">
          <div className="chip-panel-heading"><div><p className="eyebrow">ZOOM LADDER</p><h2>Package → p–n junction</h2></div></div>
          <div className="chip-zoom-steps" role="tablist" aria-label="Magnification level">
            {ZOOM_LEVELS.map((level) => <button key={level.id} role="tab" aria-selected={zoom === level.id} className={`chip-zoom-step ${zoom === level.id ? 'active' : ''}`} onClick={() => setZoom(level.id)}>{level.label}</button>)}
          </div>
          <ZoomScene level={zoom} />
          <p className="chip-zoom-caption">{zoomInfo.caption}</p>
        </section>
      </aside>
    </div>
  )
}

function CpuDatapath({ stage, running }) {
  const current = DATAPATH_STAGES[stage]
  return (
    <svg viewBox="0 0 720 460" className="chip-die-svg" role="img" aria-label="CPU die datapath animation">
      <rect x="40" y="30" width="640" height="400" rx="18" className="chip-package" />
      <rect x="120" y="90" width="480" height="280" rx="8" className="chip-die" />
      {DATAPATH_STAGES.slice(0, -1).map((item, index) => {
        const next = DATAPATH_STAGES[index + 1]
        return <line key={item.id} x1={item.waypoint.x} y1={item.waypoint.y} x2={next.waypoint.x} y2={next.waypoint.y} className={`chip-trace ${index < stage ? 'lit' : ''}`} />
      })}
      {DIE_BLOCKS.map((block) => (
        <g key={block.id} className={`chip-block ${current.block === block.id ? 'active pulse' : ''}`}>
          <rect x={block.rect.x} y={block.rect.y} width={block.rect.w} height={block.rect.h} rx="6" className="chip-block-rect" />
          <text x={block.rect.x + block.rect.w / 2} y={block.rect.y + block.rect.h / 2} textAnchor="middle" className="chip-block-name">{block.name}</text>
        </g>
      ))}
      <circle cx={current.waypoint.x} cy={current.waypoint.y} r="7" className={`chip-pulse-dot ${running ? 'running' : ''}`} />
      <circle cx={current.waypoint.x} cy={current.waypoint.y} r="14" className="chip-pulse-halo" />
    </svg>
  )
}

function GpuDatapath({ waveKey, running, waveDone }) {
  const tiles = Array.from({ length: GPU_TILES.cols * GPU_TILES.rows }, (_, i) => ({ col: i % GPU_TILES.cols, row: Math.floor(i / GPU_TILES.cols) }))
  return (
    <svg viewBox="0 0 720 460" className="chip-die-svg" role="img" aria-label="GPU core array">
      <rect x="40" y="30" width="640" height="400" rx="18" className="chip-package" />
      <rect x="120" y="90" width="480" height="280" rx="8" className="chip-die" />
      <rect x="140" y="110" width="440" height="34" rx="5" className="chip-block-rect gpu-scheduler" />
      <text x="360" y="131" textAnchor="middle" className="chip-block-name">Thread Scheduler</text>
      <g key={waveKey}>
        {tiles.map((tile, i) => {
          const delay = (tile.col + tile.row) * 45
          return <rect key={i} x={140 + tile.col * 27.9} y={152 + tile.row * 26.5} width="24" height="22" rx="3" className={`gpu-tile ${running ? 'wave' : waveDone ? 'lit' : ''}`} style={running ? { animationDelay: `${delay}ms` } : undefined} />
        })}
      </g>
      <text x="360" y="398" textAnchor="middle" className="chip-package-label">128 SIMPLE CORES · ONE SHARED INSTRUCTION STREAM</text>
    </svg>
  )
}

function LiveDatapath() {
  const [chip, setChip] = useState('cpu')
  const [stage, setStage] = useState(0)
  const [running, setRunning] = useState(false)
  const [waveKey, setWaveKey] = useState(0)
  const [waveDone, setWaveDone] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function stop() {
    clearTimeout(timerRef.current)
    timerRef.current = null
    setRunning(false)
  }

  function runCpu() {
    if (timerRef.current) { stop(); return }
    setRunning(true)
    timerRef.current = setInterval(() => setStage((s) => (s + 1) % DATAPATH_STAGES.length), 1600)
  }

  function launchKernel() {
    if (timerRef.current) { stop(); setWaveDone(false); return }
    setRunning(true)
    setWaveDone(false)
    setWaveKey((k) => k + 1)
    timerRef.current = setTimeout(() => { setRunning(false); setWaveDone(true); timerRef.current = null }, 3600)
  }

  function switchChip(next) {
    stop()
    setChip(next)
    setStage(0)
    setWaveDone(false)
  }

  const current = DATAPATH_STAGES[stage]
  return (
    <div className="chip-datapath-grid">
      <section className="chip-die-card">
        <div className="chip-panel-heading"><div><p className="eyebrow">CLOCK CYCLE</p><h2>{chip === 'cpu' ? 'One instruction, one path' : 'One kernel, one wave'}</h2></div>
          <div className="chip-mode-toggle" role="tablist" aria-label="Chip type">
            <button role="tab" aria-selected={chip === 'cpu'} className={`chip-mode ${chip === 'cpu' ? 'active' : ''}`} onClick={() => switchChip('cpu')}>CPU</button>
            <button role="tab" aria-selected={chip === 'gpu'} className={`chip-mode ${chip === 'gpu' ? 'active' : ''}`} onClick={() => switchChip('gpu')}>GPU</button>
          </div>
        </div>
        {chip === 'cpu' ? <CpuDatapath stage={stage} running={running} /> : <GpuDatapath waveKey={waveKey} running={running} waveDone={waveDone} />}
        <div className="chip-datapath-controls">
          {chip === 'cpu' ? (
            <>
              <button className="button button-primary" onClick={runCpu}>{running ? 'Pause' : 'Run cycles'}</button>
              <button className="button button-subtle" disabled={running} onClick={() => setStage((s) => (s + 1) % DATAPATH_STAGES.length)}>Step one stage</button>
              <span className="chip-stage-chip">Stage {stage + 1} / {DATAPATH_STAGES.length} · <strong>{current.label}</strong></span>
            </>
          ) : (
            <>
              <button className="button button-primary" onClick={launchKernel}>{running ? 'Reset wave' : 'Launch kernel'}</button>
              <span className="chip-stage-chip">128 cores · same instruction, 128 data lanes</span>
            </>
          )}
        </div>
      </section>
      <aside className="chip-spec-stack">
        {chip === 'cpu' ? (
          <section className="chip-spec-card" key={current.id}>
            <p className="eyebrow">CURRENT STAGE</p>
            <h3>{current.label}</h3>
            <p className="chip-spec-short">{current.text}</p>
            <div className="chip-spec-physics"><p className="eyebrow">PHYSICS INSIDE</p><p>{current.physics}</p></div>
            <div className="chip-stage-track">{DATAPATH_STAGES.map((item, i) => <span key={item.id} className={`chip-stage-pip ${i <= stage ? 'lit' : ''}`} />)}</div>
          </section>
        ) : (
          <section className="chip-spec-card">
            <p className="eyebrow">WHY SO MANY CORES?</p>
            <h3>Throughput over latency</h3>
            <p className="chip-spec-short">A GPU trades big, clever cores for a sea of small ones. Graphics and physics workloads repeat the same math on millions of pixels — so a thousand simple ALUs beat eight smart ones.</p>
            <div className="chip-spec-physics"><p className="eyebrow">PHYSICS INSIDE</p><p>Each tiny core still runs the same fetch-decode-execute cycle. Transistor budget shifts from control logic and cache into raw parallel ALUs — the die area tells you the design philosophy.</p></div>
          </section>
        )}
      </aside>
    </div>
  )
}

function SandboxBar({ label, value, max, unit, tone }) {
  const width = Math.max(2, Math.min(100, (value / max) * 100))
  return (
    <div className="chip-sandbox-bar">
      <div className="chip-sandbox-bar-top"><span>{label}</span><strong>{value >= 100 ? Math.round(value) : value.toFixed(1)} {unit}</strong></div>
      <span className="chip-sandbox-track"><i className={tone} style={{ width: `${width}%` }} /></span>
    </div>
  )
}

function DesignSandbox() {
  const [cfg, setCfg] = useState(SANDBOX_DEFAULTS)
  const set = (key) => (event) => setCfg((c) => ({ ...c, [key]: Number(event.target.value) }))

  const density = transistorDensity(cfg.nodeNm)
  const dieArea = (cfg.transistorsB * 1000) / density
  const powerDyn = dynamicPowerWatts(cfg.transistorsB, cfg.volts, cfg.clockGhz)
  const powerLeak = leakagePowerWatts(cfg.transistorsB, cfg.nodeNm)
  const powerTotal = powerDyn + powerLeak
  const ipc = cfg.cores > 48 ? 1 : cfg.cores > 16 ? 2 : 4
  const throughput = cfg.cores * cfg.clockGhz * ipc
  const verdict = cfg.cores <= 8 && cfg.cacheMb >= 8
    ? { kind: 'Latency-oriented CPU', text: 'Few powerful cores with deep cache — ideal for sequential, branchy code where every nanosecond of latency matters.' }
    : cfg.cores >= 48
      ? { kind: 'Throughput-oriented GPU', text: 'A sea of small cores — raw parallel throughput for workloads that repeat one operation across millions of data points.' }
      : { kind: 'Hybrid / SoC', text: 'A balanced design — like a modern phone chip pairing strong cores with parallel engines.' }

  const coreShare = Math.min(80, cfg.cores * 0.8)
  const cacheShare = Math.min(70, cfg.cacheMb * 1.1)
  const uncoreShare = Math.max(0, 100 - coreShare - cacheShare)
  const visibleCores = Math.min(cfg.cores, 128)

  return (
    <div className="chip-sandbox-grid">
      <section className="chip-die-card">
        <div className="chip-panel-heading"><div><p className="eyebrow">DESIGN SANDBOX</p><h2>Spend your transistor budget</h2></div></div>
        <div className="chip-slider-grid">
          {Object.entries(SANDBOX_RANGES).map(([key, range]) => (
            <label key={key} className="chip-slider">
              <span className="chip-slider-top"><span>{range.label}</span><strong>{cfg[key]}{key === 'volts' ? ' V' : ''}</strong></span>
              <input type="range" min={range.min} max={range.max} step={range.step} value={cfg[key]} onChange={set(key)} />
            </label>
          ))}
          <label className="chip-slider">
            <span className="chip-slider-top"><span>Process node</span><strong>{cfg.nodeNm} nm</strong></span>
            <select value={cfg.nodeNm} onChange={set('nodeNm')}>{NODE_OPTIONS.map((nm) => <option key={nm} value={nm}>{nm} nm</option>)}</select>
          </label>
        </div>
        <div className="chip-die-preview">
          <svg viewBox="0 0 720 300" className="chip-die-svg small" role="img" aria-label="Your design die preview">
            <rect x="30" y="20" width="660" height="260" rx="14" className="chip-package" />
            <rect x="60" y="50" width="600" height="200" rx="8" className="chip-die" />
            {Array.from({ length: visibleCores }, (_, i) => {
              const cols = Math.ceil(Math.sqrt(visibleCores * 2.1))
              const rows = Math.ceil(visibleCores / cols)
              const w = 560 / cols; const h = 130 / rows
              const col = i % cols; const row = Math.floor(i / cols)
              return <rect key={i} x={70 + col * w} y={60 + row * h} width={Math.max(6, w - 4)} height={Math.max(6, h - 4)} rx="3" className="gpu-tile lit" />
            })}
            <rect x="70" y={64 + 130} width="560" height="26" rx="4" className="chip-block-rect" />
            <text x="350" y={207} textAnchor="middle" className="chip-block-name">Shared cache · {cfg.cacheMb} MB</text>
            <text x="350" y="240" textAnchor="middle" className="chip-package-label">{visibleCores}{cfg.cores > visibleCores ? '+' : ''} CORES SHOWN</text>
          </svg>
        </div>
      </section>
      <aside className="chip-spec-stack">
        <section className="chip-spec-card">
          <p className="eyebrow">YOUR DESIGN</p>
          <h3>{verdict.kind}</h3>
          <p className="chip-spec-short">{verdict.text}</p>
          <SandboxBar label="Die area" value={dieArea} max={900} unit="mm²" tone="green" />
          <SandboxBar label="Dynamic power" value={powerDyn} max={400} unit="W" tone="lime" />
          <SandboxBar label="Leakage" value={powerLeak} max={100} unit="W" tone="dim" />
          <SandboxBar label="Peak throughput" value={throughput} max={2000} unit="GOPS" tone="green" />
          <div className="chip-spec-row"><span>Transistor density</span><strong>{density < 1 ? density.toFixed(1) : Math.round(density)} MTr/mm²</strong></div>
          <div className="chip-spec-row"><span>Total power</span><strong>{powerTotal.toFixed(0)} W</strong></div>
        </section>
        <section className="chip-spec-card">
          <p className="eyebrow">PHYSICS INSIDE</p>
          <p className="chip-physics-note">Dynamic power follows <strong>P ≈ α·C·V²·f</strong> — drop the voltage slider and watch power fall quadratically. Smaller nodes pack more transistors per mm² but leak more through ever-thinner junctions. That tension is the whole history of chip design.</p>
          <div className="chip-area-track"><span className="chip-area-cores" style={{ width: `${coreShare}%` }} /><span className="chip-area-cache" style={{ width: `${cacheShare}%` }} /><span className="chip-area-uncore" style={{ width: `${uncoreShare}%` }} /></div>
          <div className="chip-area-legend"><span><i className="chip-area-cores" />Cores</span><span><i className="chip-area-cache" />Cache</span><span><i className="chip-area-uncore" />Uncore</span></div>
        </section>
      </aside>
    </div>
  )
}

export default function ChipDesignLab({ onAskTutor }) {
  const [tab, setTab] = useState('explore')
  return (
    <div className="chip-lab-page">
      <div className="page-title-row"><div><p className="eyebrow">FROM JUNCTION TO MACHINE</p><h1>Design a <em>chip.</em></h1><p className="page-description">Zoom from a p–n junction all the way up to a working processor — then shape the die yourself.</p></div><span className="level-chip">◲ Silicon lab</span></div>
      <section className="applied-intro chip-intro"><span className="applied-intro-symbol">◲</span><div><p className="eyebrow">WHY THIS LIVES HERE</p><h2>Every chip is semiconductor physics at scale.</h2><p>The p–n junctions, MOSFETs, and biasing you studied in Unit 14 are the literal building blocks below. A modern processor is that physics repeated tens of billions of times.</p></div><span className="applied-intro-decoration" aria-hidden="true">P ≈ CV²f</span></section>
      <div className="chip-tabs" role="tablist" aria-label="Chip lab sections">
        {TABS.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`chip-tab ${tab === item.id ? 'active' : ''}`} onClick={() => setTab(item.id)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}
      </div>
      {tab === 'explore' && <DieExplorer onAskTutor={onAskTutor} />}
      {tab === 'datapath' && <LiveDatapath />}
      {tab === 'sandbox' && <DesignSandbox />}
      <section className="offline-note chip-offline"><span>⚡</span><span>Every diagram and simulation runs locally in your browser.</span></section>
    </div>
  )
}
