import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ModelMetrics.css';

/* ─── Metric data ─── */
const TEXT_MODEL = {
  name: 'CNN-BiLSTM Text Model',
  dataset: 'Emotion Dataset (6 classes)',
  architecture: 'Embedding → Conv1D → BiLSTM → Dense → Softmax',
  overall: { accuracy: 90.4, precision: 90.58, recall: 90.4, f1: 90.47 },
  perClass: [
    { emotion:'Anger',    precision:90.6, recall:90.6, f1:90.6, support:275, color:'#f5576c' },
    { emotion:'Fear',     precision:87.7, recall:86.2, f1:86.9, support:224, color:'#764ba2' },
    { emotion:'Joy',      precision:94.4, recall:92.4, f1:93.4, support:695, color:'#4facfe' },
    { emotion:'Love',     precision:75.6, recall:83.6, f1:79.4, support:159, color:'#f093fb' },
    { emotion:'Sadness',  precision:95.0, recall:95.0, f1:95.0, support:581, color:'#667eea' },
    { emotion:'Surprise', precision:57.4, recall:59.1, f1:58.2, support:66, color:'#fee140' },
  ],
};

const VOICE_MODEL = {
  name: 'LSTM Voice Emotion Model',
  dataset: 'TESS (Toronto Emotional Speech Set)',
  architecture: '40-MFCC Features → LSTM → Dense → Softmax',
  trainNote: 'Train acc: 99.98% · Val acc: 97.68% · Val loss: 0.0787',
  overall: { accuracy: 97.68, precision: 97.73, recall: 97.68, f1: 97.69 },
  perClass: [
    { emotion:'Angry',   precision:98.8, recall:98.8, f1:98.8, support:80, color:'#f5576c' },
    { emotion:'Disgust', precision:97.4, recall:92.5, f1:94.9, support:80, color:'#fa709a' },
    { emotion:'Fear',    precision:100.0, recall:98.8, f1:99.4, support:80, color:'#764ba2' },
    { emotion:'Happy',   precision:96.3, recall:98.8, f1:97.5, support:80, color:'#4facfe' },
    { emotion:'Neutral', precision:100.0, recall:100.0, f1:100.0, support:80, color:'#8892b0' },
    { emotion:'PS',      precision:91.7, recall:96.3, f1:93.9, support:80, color:'#fee140' },
    { emotion:'Sad',     precision:100.0, recall:98.8, f1:99.4, support:80, color:'#667eea' },
  ],
};

function CircleGauge({ value, color, size = 110 }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPct(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  const dashOffset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(139,92,246,0.1)" strokeWidth={10}/>
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.34,1.56,.64,1)' }}
      />
    </svg>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div className="mm-metric-card">
      <div className="mm-gauge-wrap">
        <CircleGauge value={value} color={color} />
        <div className="mm-gauge-value" style={{ color }}>{value.toFixed(1)}%</div>
      </div>
      <div className="mm-metric-label">{label}</div>
    </div>
  );
}

function PerClassTable({ rows }) {
  return (
    <div className="mm-table-wrap">
      <table className="mm-table">
        <thead>
          <tr>
            <th>Emotion</th><th>Precision</th><th>Recall</th><th>F1 Score</th><th>Support</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <span className="mm-emotion-dot" style={{ background: r.color }}/>
                {r.emotion}
              </td>
              <td>
                <div className="mm-bar-cell">
                  <div className="mm-bar-inner" style={{ width:`${r.precision}%`, background:r.color }}/>
                  <span>{r.precision.toFixed(1)}%</span>
                </div>
              </td>
              <td>
                <div className="mm-bar-cell">
                  <div className="mm-bar-inner" style={{ width:`${r.recall}%`, background:r.color }}/>
                  <span>{r.recall.toFixed(1)}%</span>
                </div>
              </td>
              <td>
                <div className="mm-bar-cell">
                  <div className="mm-bar-inner" style={{ width:`${r.f1}%`, background:r.color, opacity:.9 }}/>
                  <span>{r.f1.toFixed(1)}%</span>
                </div>
              </td>
              <td className="mm-support">{r.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelSection({ model, accentColor, gradientFrom }) {
  return (
    <div className="mm-model-section" style={{ '--accent': accentColor, '--grad-from': gradientFrom }}>
      <div className="mm-section-header">
        <div className="mm-section-glow" />
        <div className="mm-section-meta">
          <span className="mm-section-tag" style={{ borderColor: accentColor, color: accentColor }}>
            {model.dataset}
          </span>
          <h2 className="mm-section-title">{model.name}</h2>
          <code className="mm-arch">{model.architecture}</code>
          {model.trainNote && (
            <div className="mm-train-note">📊 {model.trainNote}</div>
          )}
        </div>
      </div>

      {/* Overall metrics */}
      <div className="mm-overall-grid">
        {[
          { label:'Accuracy',  value:model.overall.accuracy,  color:'#a78bfa' },
          { label:'Precision', value:model.overall.precision, color:accentColor },
          { label:'Recall',    value:model.overall.recall,    color:'#22d3ee' },
          { label:'F1 Score',  value:model.overall.f1,        color:'#4facfe' },
        ].map((m,i) => <MetricCard key={i} {...m} />)}
      </div>

      {/* Per-class table */}
      <h3 className="mm-table-title">Per-Class Performance</h3>
      <PerClassTable rows={model.perClass} />
    </div>
  );
}

export default function ModelMetrics() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('text');

  return (
    <div className="mm-root">
      {/* BG */}
      <div className="mm-bg-1"/><div className="mm-bg-2"/>
      <div className="mm-grid"/>

      {/* Header */}
      <header className="mm-header">
        <button className="mm-back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Home
        </button>
        <div className="mm-header-center">
          <h1 className="mm-page-title">Model Performance Metrics</h1>
          <p className="mm-page-sub">Detailed accuracy, precision, recall & F1 scores for both AI models</p>
        </div>
        <div style={{width:120}}/>
      </header>

      {/* Comparison bar */}
      <div className="mm-compare">
        <div className="mm-compare-item">
          <span className="mm-compare-label">Text Model (Test)</span>
          <div className="mm-compare-track">
            <div className="mm-compare-fill purple" style={{width:`${TEXT_MODEL.overall.accuracy}%`}}/>
          </div>
          <span className="mm-compare-val">{TEXT_MODEL.overall.accuracy.toFixed(1)}%</span>
        </div>
        <div className="mm-compare-divider">vs</div>
        <div className="mm-compare-item">
          <span className="mm-compare-label">Voice Model (Validation)</span>
          <div className="mm-compare-track">
            <div className="mm-compare-fill teal" style={{width:`${VOICE_MODEL.overall.accuracy}%`}}/>
          </div>
          <span className="mm-compare-val">{VOICE_MODEL.overall.accuracy.toFixed(1)}%</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="mm-tabs">
        <button className={`mm-tab ${tab==='text'?'active':''}`} onClick={()=>setTab('text')}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6C4.895 2 4 2.895 4 4V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Text Model
        </button>
        <button className={`mm-tab ${tab==='voice'?'active':''}`} onClick={()=>setTab('voice')}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 10V12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Voice Model
        </button>
        <button className={`mm-tab ${tab==='both'?'active':''}`} onClick={()=>setTab('both')}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Compare Both
        </button>
      </div>

      {/* Content */}
      <div className="mm-content">
        {(tab==='text'||tab==='both') && (
          <ModelSection model={TEXT_MODEL} accentColor="#a78bfa" gradientFrom="rgba(124,58,237,0.15)" />
        )}
        {(tab==='voice'||tab==='both') && (
          <ModelSection model={VOICE_MODEL} accentColor="#06b6d4" gradientFrom="rgba(6,182,212,0.12)" />
        )}
      </div>

      <footer className="mm-footer">
        <p>© 2025 Anvitha AI · Model metrics based on held-out evaluation sets</p>
      </footer>
    </div>
  );
}
