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
  const [voiceTranscription, setVoiceTranscription] = useState(null); // Box 1: "You said"
  const [emotionResult, setEmotionResult] = useState(null);            // Box 2: "Voice Emotion Detected"
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

  useEffect(() => () => { cancelAnimationFrame(animRef.current); }, []);

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t=>t.stop());
      stopViz();
      return;
    }
    setError(null); setVoiceTranscription(null); setEmotionResult(null);
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
          setError(null);
          setVoiceTranscription(null);
          setEmotionResult(null);
          const raw = new Blob(audioChunksRef.current,{type:mr.mimeType||'audio/webm'});
          const wav = await blobToWav(raw);
          const fd = new FormData();
          fd.append('audio',wav,'rec.wav');
          // Step 1: transcribe only — show Box 1 "You said"
          const transcribeRes = await axios.post(apiUrl('/api/transcribe'), fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const text = (transcribeRes.data?.text || '').trim() || '';
          setVoiceTranscription(text);

          // Run Step 2 in a separate task so React doesn't batch both updates (Box 1 paints first, then Box 2 when predict returns)
          setTimeout(async () => {
            try {
              const predictRes = await axios.post(apiUrl('/api/predict'), { text: text || 'neutral' });
              setEmotionResult(predictRes.data);
            } catch (e) {
              setError(e.response?.data?.error || 'Failed to analyze voice.');
            } finally {
              setLoading(false);
              setIsRecording(false);
            }
          }, 0);
        } catch(e) {
          setError(e.response?.data?.error||'Failed to analyze voice.');
          setLoading(false);
          setIsRecording(false);
        }
      };
      mr.start();
      setIsRecording(true);
    } catch(e) {
      setError('Microphone access denied.');
    }
  };

  const emotionColor = emotionResult ? getColor(emotionResult.emotion) : '#a78bfa';

  return (
    <div className="vai-root">
      {/* Background glow */}
      <div className="vai-bg-glow" style={{background:`radial-gradient(ellipse at 50% 0%,${emotionColor}22 0%,transparent 65%)`}}/>

      <div className="vai-layout">
        {/* Left: title, visualizer, record, tips */}
        <div className="vai-left">
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

          {error && (
            <div className="vai-error">
              <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8V12M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          <div className="vai-tips">
            <span className="vai-tip"><span>💡</span> Speak clearly for 3–5 seconds</span>
            <span className="vai-tip"><span>🎙️</span> Use Chrome or Edge for best results</span>
            <span className="vai-tip"><span>🔇</span> Minimize background noise</span>
          </div>
        </div>

        {/* Right: result boxes */}
        <aside className="vai-right">
          {voiceTranscription != null && (
            <div className="vai-box vai-box-1">
              <div className="vai-box-label">YOU SAID</div>
              <p className="vai-box-text">{voiceTranscription}</p>
            </div>
          )}
          {(emotionResult || (voiceTranscription != null && loading)) && (
            <div className="vai-box vai-box-2" style={{borderColor:`${emotionColor}44`,boxShadow:`0 0 40px ${emotionColor}22`}}>
              <div className="vai-result-glow" style={{background:`radial-gradient(circle at 50% 0%,${emotionColor}25,transparent 65%)`}}/>
              <div className="vai-result-emoji">{getEmoji(emotionResult?.emotion)}</div>
              <span className="vai-result-tag">VOICE EMOTION DETECTED</span>
              {emotionResult?.emotion ? (
                <span className="vai-result-emotion" style={{color:emotionColor}}>
                  {emotionResult.emotion.charAt(0).toUpperCase() + emotionResult.emotion.slice(1)}
                </span>
              ) : (
                <div className="vai-analyzing"><span className="vai-spin"/> Analyzing emotion...</div>
              )}
            </div>
          )}
          {!voiceTranscription && !emotionResult && !loading && (
            <div className="vai-placeholder">
              <p className="vai-placeholder-title">Results appear here</p>
              <p className="vai-placeholder-sub">Record your voice to see transcription and detected emotion</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default VoiceAnalyzerUI;
