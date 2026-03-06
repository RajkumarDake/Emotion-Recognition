import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── 3D floating shapes rendered via CSS + JS ── */
const SHAPES = [
  { type: 'ring',  size: 120, x: 8,  y: 18, speed: 14 },
  { type: 'cube',  size: 60,  x: 88, y: 12, speed: 18 },
  { type: 'ring',  size: 80,  x: 78, y: 68, speed: 22 },
  { type: 'cube',  size: 45,  x: 15, y: 72, speed: 20 },
  { type: 'sphere',size: 100, x: 52, y: 8,  speed: 16 },
  { type: 'ring',  size: 55,  x: 5,  y: 45, speed: 25 },
  { type: 'sphere',size: 50,  x: 92, y: 42, speed: 19 },
];

function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ── Mouse parallax ── */
  useEffect(() => {
    const onMove = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  /* ── Particle + 3D wireframe canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    /* Particles */
    const PARTICLE_COUNT = 140;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.3,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.7 + 0.2,
      color: ['#7c3aed', '#4f46e5', '#06b6d4', '#a855f7', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 6)],
    }));

    /* 3D wireframe icosahedron vertices helper */
    const phi = (1 + Math.sqrt(5)) / 2;
    const icoVerts = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(([x, y, z]) => { const l = Math.sqrt(x*x+y*y+z*z); return [x/l, y/l, z/l]; });
    const icoEdges = [
      [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
      [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
      [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],[7,8],[7,10],[8,9],[10,11],
    ];

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.004;

      /* connections between particles */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const ddx = particles[i].x - particles[j].x, ddy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(ddx*ddx + ddy*ddy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139,92,246,${0.2 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      /* particles */
      particles.forEach(p => {
        p.x = (p.x + p.dx + canvas.width) % canvas.width;
        p.y = (p.y + p.dy + canvas.height) % canvas.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      /* 3D wireframe icosahedra */
      const icos = [
        { cx: canvas.width * 0.12, cy: canvas.height * 0.25, r: 55, rx: t * 0.7, ry: t, col: 'rgba(124,58,237,' },
        { cx: canvas.width * 0.88, cy: canvas.height * 0.22, r: 40, rx: t * 0.9, ry: t * 0.6, col: 'rgba(6,182,212,' },
        { cx: canvas.width * 0.82, cy: canvas.height * 0.72, r: 48, rx: t * 0.5, ry: t * 0.8, col: 'rgba(168,85,247,' },
        { cx: canvas.width * 0.5, cy: canvas.height * 0.09, r: 32, rx: t * 1.1, ry: t * 0.4, col: 'rgba(79,70,229,' },
      ];

      icos.forEach(({ cx, cy, r, rx, ry, col }) => {
        const project = ([x, y, z]) => {
          // Rotate Y
          const cosY = Math.cos(ry), sinY = Math.sin(ry);
          const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
          // Rotate X
          const cosX = Math.cos(rx), sinX = Math.sin(rx);
          const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
          const fov = 3; const perspective = fov / (fov + z2);
          return [cx + x1 * r * perspective, cy + y2 * r * perspective, perspective];
        };
        const projected = icoVerts.map(project);
        icoEdges.forEach(([a, b]) => {
          const [ax, ay, ap] = projected[a], [bx, by] = projected[b];
          const alpha = (ap * 0.55).toFixed(2);
          ctx.beginPath();
          ctx.strokeStyle = `${col}${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        });
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animFrameRef.current); };
  }, []);

  return (
    <div className="landing-page">
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* Background orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />
      <div className="landing-orb landing-orb-3" />
      <div className="landing-orb landing-orb-4" />

      {/* Grid */}
      <div className="landing-grid" />

      {/* 3D floating CSS shapes */}
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className={`shape-3d shape-${s.type}`}
          style={{
            position: 'fixed',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDuration: `${s.speed}s`,
            animationDelay: `${-i * 2.5}s`,
            transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -12}px)`,
          }}
        />
      ))}

      {/* ── HEADER ── */}
      <header className="landing-header">
        <div className="landing-logo">
          <svg className="landing-logo-icon" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M16 3L3 10L16 17L29 10L16 3Z" stroke="url(#logoGrad)" strokeWidth="2" strokeLinejoin="round" />
            <path d="M3 22L16 29L29 22" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 16L16 23L29 16" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="landing-logo-text">Anvitha AI</span>
        </div>
        <nav className="landing-nav">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#about" className="landing-nav-link">About</a>
          <button className="landing-nav-metrics-btn" onClick={() => navigate('/metrics')}>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Model Metrics
          </button>
        </nav>
      </header>

      {/* ── HERO ── */}
      <main className="landing-hero">
        <div className="landing-badge">
          <span className="badge-dot" />
          <span>Powered by Advanced Deep Learning</span>
        </div>

        {/* 3D floating mic/wave decoration */}
        <div className="hero-3d-deco hero-deco-left">
          <div className="deco-ring deco-ring-1" />
          <div className="deco-ring deco-ring-2" />
          <div className="deco-ring deco-ring-3" />
          <div className="deco-core">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="rgba(167,139,250,0.5)" strokeWidth="1.5" strokeDasharray="4 3"/>
              <path d="M20 10C18.34 10 17 11.34 17 13V20C17 21.66 18.34 23 20 23C21.66 23 23 21.66 23 20V13C23 11.34 21.66 10 20 10Z" stroke="#a78bfa" strokeWidth="1.5"/>
              <path d="M26 18V20C26 23.314 23.314 26 20 26C16.686 26 14 23.314 14 20V18" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M20 26V30M17 30H23" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="hero-3d-deco hero-deco-right">
          <div className="deco-ring deco-ring-1" />
          <div className="deco-ring deco-ring-2" />
          <div className="deco-ring deco-ring-3" />
          <div className="deco-core">
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="rgba(103,232,249,0.4)" strokeWidth="1.5" strokeDasharray="4 3"/>
              <path d="M11 14H29M11 20H29M11 26H22" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h1 className="landing-title">
          <span className="landing-title-line">Understand Emotions</span>
          <span className="landing-title-gradient">with AI Precision</span>
        </h1>

        <p className="landing-subtitle">
          Multimodal AI classifying emotions across 7+ categories.
          <br />Get instant insights from voice and text in under a second.
        </p>

        {/* CTA */}
        <div className="landing-cta">
          <button id="btn-analyze-voice" className="cta-btn cta-btn-voice" onClick={() => navigate('/voice')}>
            <div className="cta-btn-bg" /><div className="cta-btn-glow" />
            <span className="cta-btn-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 10V12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="cta-btn-label">Analyze Voice</span>
            <span className="cta-btn-arrow">→</span>
          </button>

          <button id="btn-analyze-text" className="cta-btn cta-btn-text" onClick={() => navigate('/text')}>
            <div className="cta-btn-bg" /><div className="cta-btn-glow" />
            <span className="cta-btn-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.895 2 4 2.895 4 4V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="cta-btn-label">Analyze Text</span>
            <span className="cta-btn-arrow">→</span>
          </button>
        </div>

        {/* Stats */}
        <div className="landing-stats">
          <div className="stat-item">
            <span className="stat-number">90.4%</span>
            <span className="stat-label">Text Accuracy</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">97.7%</span>
            <span className="stat-label">Voice Accuracy</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">7+</span>
            <span className="stat-label">Emotions</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">&lt; 1s</span>
            <span className="stat-label">Response</span>
          </div>
        </div>
      </main>

      {/* ── 3D FLOATING WAVEFORM BAND ── */}
      <div className="waveform-band">
        {Array.from({ length: 32 }, (_, i) => (
          <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s`, animationDuration: `${0.8 + (i % 6) * 0.15}s` }} />
        ))}
      </div>

      {/* ── FEATURE CARDS ── */}
      <section className="landing-features" id="features">
        {[
          {
            icon: <svg viewBox="0 0 24 24" fill="none"><path d="M9 9H5C3.895 9 3 9.895 3 11V13C3 14.105 3.895 15 5 15H6L9 21V3L6 9H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 6C17.333 7.333 18 9 18 12C18 15 17.333 16.667 16 18M13 9C13.667 9.667 14 10.667 14 12C14 13.333 13.667 14.333 13 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
            cls: 'voice', title: 'Voice Analysis',
            desc: 'Real-time microphone capture with deep audio processing to detect emotions from tone, pitch and rhythm.',
            tag: '97.7% Acc',
          },
          {
            icon: <svg viewBox="0 0 24 24" fill="none"><path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
            cls: 'text', title: 'Text Analysis',
            desc: 'NLP-powered emotion extraction using CNN-BiLSTM architecture understanding context and nuanced linguistic patterns.',
            tag: '90.4% Acc',
          },
          {
            icon: <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
            cls: 'ai', title: 'Deep Learning',
            desc: 'CNN-BiLSTM and LSTM neural networks trained on TESS and emotion-labeled text data for robust cross-modal emotion recognition.',
            tag: 'Multi-Modal',
          },
          {
            icon: <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
            cls: 'realtime', title: 'Real-Time',
            desc: 'Sub-second response times with optimized inference pipeline delivering emotion predictions under 500ms.',
            tag: '&lt; 500ms',
          },
        ].map((card, i) => (
          <div
            key={i}
            className="feature-card"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className={`feature-icon feature-icon-${card.cls}`}>{card.icon}</div>
            <div className="feature-card-tag" dangerouslySetInnerHTML={{ __html: card.tag }} />
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <div className="feature-card-bar">
              <div className={`feature-card-bar-fill bar-${card.cls}`} />
            </div>
          </div>
        ))}
      </section>

      {/* ── METRICS TEASER ── */}
      <section className="metrics-teaser" id="about">
        <div className="metrics-teaser-content">
          <div className="metrics-teaser-left">
            <span className="teaser-label">Model Performance</span>
            <h2>Production-Grade<br /><span className="gradient-text-teal">Accuracy Metrics</span></h2>
            <p>Both models trained on curated emotion datasets — TESS for voice and emotion-labeled text data for text — achieving strong performance across 6 to 7 emotion classes.</p>
            <button className="teaser-btn" onClick={() => navigate('/metrics')}>
              View Full Metrics →
            </button>
          </div>
          <div className="metrics-teaser-right">
            {[
              { label: 'Text Model F1', val: 90.5, color: '#a78bfa' },
              { label: 'Voice Model F1', val: 97.7, color: '#06b6d4' },
              { label: 'Text Precision', val: 90.6, color: '#4f46e5' },
              { label: 'Voice Recall', val: 97.7, color: '#8b5cf6' },
            ].map((m, i) => (
              <div key={i} className="teaser-bar-row">
                <span className="teaser-bar-label">{m.label}</span>
                <div className="teaser-bar-track">
                  <div className="teaser-bar-fill" style={{ width: `${m.val}%`, background: m.color, animationDelay: `${i * 0.15}s` }} />
                </div>
                <span className="teaser-bar-val">{m.val}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2025 Anvitha AI · Emotion Recognition Platform</p>
      </footer>
    </div>
  );
}

export default LandingPage;
