import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import './VoiceAnalyzerUI.css';
import { apiUrl } from '../lib/api.js';

/* ── Emotion data ── */
const EMOTION_COLORS = {
  joy:'#4facfe',happiness:'#4facfe',happy:'#4facfe',
  sadness:'#667eea',sad:'#667eea',
  anger:'#f5576c',angry:'#f5576c',
  fear:'#764ba2',surprise:'#fee140',disgust:'#fa709a',
  neutral:'#8892b0',love:'#f093fb',excitement:'#00f2fe',ps:'#fee140',
};
const EMOTION_EMOJI = {
  joy:'😊',happiness:'😊',happy:'😊',sadness:'😢',sad:'😢',
  anger:'😠',angry:'😠',fear:'😨',surprise:'😲',
  disgust:'🤢',neutral:'😐',love:'😍',excitement:'🤩',ps:'😮',
};
const getColor = (e) => EMOTION_COLORS[(e||'').toLowerCase()] || '#a78bfa';
const getEmoji = (e) => EMOTION_EMOJI[(e||'').toLowerCase()] || '💭';

function VoiceAnalyzerUI() {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [bars, setBars] = useState(Array(36).fill(4));
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);

  /* ── Live waveform visualization ── */
  const startViz = useCallback((stream) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    src.connect(analyser);
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      setBars(Array.from({ length: 36 }, (_, i) => {
        const idx = Math.floor(i * data.length / 36);
        return Math.max(4, (data[idx] / 255) * 80);
      }));
      animRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopViz = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setBars(Array(36).fill(4));
  }, []);

  /* ── WAV converter ── */
  const blobToWav = async (blob) => {
    const ab = await blob.arrayBuffer();
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await ac.decodeAudioData(ab);
    const { numberOfChannels: ch, sampleRate: sr, length: len } = decoded;
    const buf = new ArrayBuffer(44 + len * ch * 2);
    const v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0,'RIFF');v.setUint32(4,36+len*ch*2,true);ws(8,'WAVE');ws(12,'fmt ');
    v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);
    v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);
    v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,len*ch*2,true);
    const channels = Array.from({length:ch},(_,c)=>decoded.getChannelData(c));
    let offset = 44;
    for (let i=0;i<len;i++) for(let c=0;c<ch;c++){
      const s=Math.max(-1,Math.min(1,channels[c][i]));
      v.setInt16(offset,s<0?s*0x8000:s*0x7FFF,true);offset+=2;
    }
    return new Blob([buf],{type:'audio/wav'});
  };

  /* ── Warm up ── */
  useEffect(() => { axios.post(apiUrl('/api/predict'),{text:'hello'}).catch(()=>{}); }, []);

  useEffect(() => () => { cancelAnimationFrame(animRef.current); }, []);

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t=>t.stop());
      stopViz();
      return;
    }
    setError(null); setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      streamRef.current = stream;
      startViz(stream);
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if(e.data.size>0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          setLoading(true);
          const raw = new Blob(audioChunksRef.current,{type:mr.mimeType||'audio/webm'});
          const wav = await blobToWav(raw);
          const fd = new FormData();
          fd.append('audio',wav,'rec.wav');
          const res = await axios.post(apiUrl('/api/predict-voice'),fd,{headers:{'Content-Type':'multipart/form-data'}});
          setResult(res.data);
        } catch(e) {
          setError(e.response?.data?.error||'Failed to analyze voice.');
        } finally { setLoading(false); setIsRecording(false); }
      };
      mr.start();
      setIsRecording(true);
    } catch(e) {
      setError('Microphone access denied.');
    }
  };

  const emotionColor = result ? getColor(result.emotion) : '#a78bfa';

  return (
    <div className="vai-root">
      {/* Background glow */}
      <div className="vai-bg-glow" style={{background:`radial-gradient(ellipse at 50% 0%,${emotionColor}22 0%,transparent 65%)`}}/>

      {/* Title */}
      <div className="vai-header">
        <div className="vai-icon-wrap" style={{boxShadow:`0 0 28px ${emotionColor}55`}}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke={emotionColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 10V12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12V10" stroke={emotionColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 19V23M8 23H16" stroke={emotionColor} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h2 className="vai-title">Voice Emotion Analyzer</h2>
          <p className="vai-subtitle">Speak aloud — AI detects your emotional tone in real-time</p>
        </div>
      </div>

      {/* Waveform visualizer */}
      <div className="vai-visualizer" style={{borderColor:`${emotionColor}33`}}>
        <div className="vai-viz-bars">
          {bars.map((h, i) => (
            <div key={i} className="vai-bar"
              style={{
                height: `${h}px`,
                background: isRecording
                  ? `linear-gradient(to top,${emotionColor},${emotionColor}88)`
                  : loading
                  ? `linear-gradient(to top,#a78bfa,#7c3aed)`
                  : 'rgba(139,92,246,0.25)',
                transition: isRecording ? 'height 0.06s ease' : 'height 0.4s ease, background 0.5s',
              }}
            />
          ))}
        </div>
        <div className="vai-viz-label">
          {isRecording && <><span className="vai-rec-dot" />Recording...</>}
          {loading && !isRecording && <><span className="vai-spin" />Analyzing audio...</>}
          {!isRecording && !loading && <span style={{opacity:.5}}>Press record to begin</span>}
        </div>
      </div>

      {/* Record button */}
      <div className="vai-controls">
        <button
          className={`vai-record-btn ${isRecording?'recording':''} ${loading?'loading':''}`}
          onClick={handleRecord}
          disabled={loading}
          style={isRecording ? {boxShadow:`0 0 40px ${emotionColor}66,0 8px 32px ${emotionColor}44`}:{}}
        >
          {isRecording ? (
            <>
              <span className="vai-btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              </span>
              Stop & Analyze
            </>
          ) : loading ? (
            <><span className="vai-spin-lg"/><span>Processing...</span></>
          ) : (
            <>
              <span className="vai-btn-icon vai-mic-pulse">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </span>
              Start Recording
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="vai-error">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8V12M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="vai-result" style={{borderColor:`${emotionColor}44`,boxShadow:`0 0 40px ${emotionColor}22`}}>
          <div className="vai-result-glow" style={{background:`radial-gradient(circle at 50% 0%,${emotionColor}25,transparent 65%)`}}/>
          <div className="vai-result-emoji">{getEmoji(result.emotion)}</div>
          <div className="vai-result-body">
            <span className="vai-result-tag">Voice Emotion Detected</span>
            <span className="vai-result-emotion" style={{color:emotionColor}}>
              {result.emotion?.charAt(0).toUpperCase()+(result.emotion?.slice(1)||'')}
            </span>
            {result.time_ms != null && (
              <span className="vai-result-time">⚡ {result.time_ms} ms</span>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="vai-tips">
        <span className="vai-tip"><span>💡</span> Speak clearly for 3–5 seconds</span>
        <span className="vai-tip"><span>🎙️</span> Use Chrome or Edge for best results</span>
        <span className="vai-tip"><span>🔇</span> Minimize background noise</span>
      </div>
    </div>
  );
}

export default VoiceAnalyzerUI;
