import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TextAnalyzerUI.css';
import { apiUrl } from '../lib/api';

const EMOTION_COLORS = {
  joy:'#4facfe',happiness:'#4facfe',happy:'#4facfe',
  sadness:'#667eea',sad:'#667eea',
  anger:'#f5576c',angry:'#f5576c',
  fear:'#764ba2',surprise:'#fee140',disgust:'#fa709a',
  neutral:'#8892b0',love:'#f093fb',excitement:'#00f2fe',ps:'#fee140',
};
const EMOTION_EMOJI={
  joy:'😊',happiness:'😊',happy:'😊',sadness:'😢',sad:'😢',
  anger:'😠',angry:'😠',fear:'😨',surprise:'😲',
  disgust:'🤢',neutral:'😐',love:'😍',excitement:'🤩',ps:'😮',
};
const SAMPLES=[
  "I can't believe I finally finished this project, I'm so relieved!",
  "This is the worst day of my life, I'm devastated.",
  "I'm absolutely thrilled about our upcoming vacation!",
  "I feel really sad and lonely today.",
  "That movie was absolutely terrifying!",
  "I'm so angry about what happened yesterday!",
];

const getColor = (e) => EMOTION_COLORS[(e||'').toLowerCase()] || '#a78bfa';
const getEmoji = (e) => EMOTION_EMOJI[(e||'').toLowerCase()] || '💭';

export default function TextAnalyzerUI() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => { axios.post(apiUrl('/api/predict'),{text:'hello'}).catch(()=>{}); }, []);

  const analyze = async (t = text) => {
    if (!t.trim()) { setError('Please enter some text to analyze.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await axios.post(apiUrl('/api/predict'), { text: t });
      setResult(res.data);
    } catch(e) {
      setError(e.response?.data?.error || 'Failed to analyze text.');
    } finally { setLoading(false); }
  };

  const emotionColor = result ? getColor(result.emotion) : '#a78bfa';

  return (
    <div className="tai-root">
      <div className="tai-bg-glow" style={{background:`radial-gradient(ellipse at 50% 0%,${emotionColor}1a 0%,transparent 65%)`}}/>

      {/* Header */}
      <div className="tai-header">
        <div className="tai-icon-wrap" style={{boxShadow:`0 0 28px ${emotionColor}55`}}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke={emotionColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="tai-title">Text Emotion Analyzer</h2>
          <p className="tai-subtitle">Type or paste text — our CNN-BiLSTM model detects emotion instantly</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="tai-layout">
        {/* Left: input */}
        <div className="tai-left">
          <div className="tai-input-card">
            <div className="tai-input-top">
              <label className="tai-input-label">Your Text</label>
              <span className="tai-hint">Ctrl+Enter to analyze</span>
            </div>
            <textarea
              className="tai-textarea"
              placeholder="Express yourself... type how you feel, share a story, or paste any text."
              value={text}
              onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&e.ctrlKey)analyze();}}
              rows={7}
              style={{caretColor:emotionColor}}
            />
            <div className="tai-input-footer">
              <span className="tai-charcount" style={{color: text.length > 400 ? '#f5576c' : undefined}}>
                {text.length} chars
              </span>
              <button
                className="tai-analyze-btn"
                onClick={()=>analyze()}
                disabled={loading||!text.trim()}
                style={{boxShadow:`0 6px 24px ${emotionColor}44`}}
              >
                {loading ? (
                  <><span className="tai-spin"/><span>Analyzing...</span></>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" style={{width:18,height:18}}>
                      <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Analyze Emotion
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="tai-error">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8V12M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          {/* Sample texts */}
          <div className="tai-samples">
            <span className="tai-samples-label">Try a sample</span>
            <div className="tai-samples-grid">
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  className={`tai-sample ${activeTag===i?'active':''}`}
                  onClick={()=>{ setText(s); setActiveTag(i); setResult(null); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" style={{width:14,height:14,flexShrink:0}}>
                    <path d="M7 8H17M7 12H17M7 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: result panel */}
        <div className="tai-right">
          {result ? (
            <div className="tai-result-card" style={{borderColor:`${emotionColor}44`,boxShadow:`0 0 50px ${emotionColor}18`}}>
              <div className="tai-result-glow" style={{background:`radial-gradient(circle at 50% 0%,${emotionColor}28,transparent 65%)`}}/>
              <div className="tai-result-emoji">{getEmoji(result.emotion)}</div>
              <div className="tai-result-tag">Text Emotion Detected</div>
              <div className="tai-result-emotion" style={{color:emotionColor}}>
                {result.emotion?.charAt(0).toUpperCase()+(result.emotion?.slice(1)||'')}
              </div>
              {result.time_ms!=null && (
                <div className="tai-result-time">⚡ {result.time_ms} ms</div>
              )}
              <div className="tai-result-divider" style={{background:`linear-gradient(90deg,transparent,${emotionColor}44,transparent)`}}/>
              <p className="tai-result-text">"{result.text || text}"</p>
            </div>
          ) : (
            <div className="tai-placeholder">
              <div className="tai-ph-orb tai-ph-orb-1"/>
              <div className="tai-ph-orb tai-ph-orb-2"/>
              <div className="tai-ph-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
                    stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="tai-ph-title">Result appears here</p>
              <p className="tai-ph-sub">Enter text and click Analyze Emotion</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
