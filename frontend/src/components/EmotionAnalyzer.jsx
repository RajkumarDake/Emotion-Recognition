import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './EmotionAnalyzer.css';
import { apiUrl } from '../lib/api.js';

function EmotionAnalyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzingType, setAnalyzingType] = useState(null); // 'text' or 'voice'
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const emotionColors = {
    'joy': '#4facfe',
    'happiness': '#4facfe',
    'happy': '#4facfe',
    'sadness': '#667eea',
    'sad': '#667eea',
    'anger': '#f5576c',
    'angry': '#f5576c',
    'fear': '#764ba2',
    'surprise': '#fee140',
    'disgust': '#fa709a',
    'neutral': '#b8b8d1',
    'love': '#f093fb',
    'excitement': '#00f2fe',
    'ps': '#fee140'
  };

  // Short codes from voice/text model -> display with full name in brackets
  const emotionDisplayLabels = {
    'ps': 'Pleasant Surprise'
  };

  // Emotion symbols (emoji) for the result box
  const emotionSymbols = {
    'joy': '😊',
    'happiness': '😊',
    'happy': '😊',
    'sadness': '😢',
    'sad': '😢',
    'anger': '😠',
    'angry': '😠',
    'fear': '😨',
    'surprise': '😲',
    'disgust': '🤢',
    'neutral': '😐',
    'love': '😍',
    'excitement': '🤩',
    'ps': '😮'
  };

  const getEmotionSymbol = (emotion) => {
    if (!emotion) return '😊';
    return emotionSymbols[emotion.toLowerCase().trim()] || '💭';
  };

  const getEmotionDisplayLabel = (emotion) => {
    if (!emotion) return '';
    const key = emotion.toLowerCase().trim();
    const full = emotionDisplayLabels[key];
    return full ? `${emotion} (${full})` : emotion;
  };

  // Convert MediaRecorder blob (e.g. webm/opus) to WAV so backend can read it
  const blobToWav = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    const numChannels = decoded.numberOfChannels;
    const sampleRate = decoded.sampleRate;
    const duration = decoded.duration;
    const numSamples = decoded.length * numChannels;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);
    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(decoded.getChannelData(c));
    // WAV header (44 bytes)
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true);  // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);
    // interleave and convert float32 to int16
    let offset = 44;
    for (let i = 0; i < decoded.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Warm-up: call text predict once on load so the second (real) request is fast
  useEffect(() => {
    axios.post(apiUrl('/api/predict'), { text: 'hello' }).catch(() => {});
  }, []);

  // Cleanup MediaRecorder on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const analyzeVoice = async (audioBlob) => {
    setLoading(true);
    setAnalyzingType('voice');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await axios.post(apiUrl('/api/predict-voice'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { confidence, ...rest } = response.data;
      setResult({ ...rest, isVoice: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze voice emotion. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setIsRecording(false);
    }
  };

  const analyzeText = async (inputText) => {
    if (!inputText.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setAnalyzingType('text');
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(apiUrl('/api/predict'), {
        text: inputText
      });

      const { confidence, ...rest } = response.data;
      setResult(rest);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze emotion. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    await analyzeText(text);
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        try {
          const wavBlob = await blobToWav(rawBlob);
          await analyzeVoice(wavBlob);
        } catch (err) {
          console.error('Audio conversion error:', err);
          setError('Could not process recording. Try again or use a different browser.');
          setIsRecording(false);
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied or not supported.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAnalyze();
    }
  };

  const sampleTexts = [
    "I can't believe I finally finished this project, I'm so relieved!",
    "This is the worst day of my life.",
    "I'm so excited about the upcoming vacation!",
    "I feel really sad and lonely today.",
    "That movie was absolutely terrifying!",
    "I'm so angry about what happened!"
  ];

  const handleSampleClick = (sampleText) => {
    setText(sampleText);
  };

  const getEmotionColor = (emotion) => {
    return emotionColors[emotion.toLowerCase()] || '#667eea';
  };

  return (
    <div className="emotion-analyzer container">
      <div className="analyzer-header">
        <h2 className="analyzer-title">
          <span className="gradient-text">Analyze Your Emotions</span>
        </h2>
        <p className="analyzer-subtitle">
          Powered by advanced AI to understand the emotions in your text
        </p>
      </div>

      <div className="analyzer-content">
        {/* Left column: input + status + error + samples */}
        <div className="analyzer-left">
          {(isRecording || loading) && (
            <div className="voice-status">
              <div className="status-indicator">
                {isRecording && (
                  <>
                    <div className="status-icon listening">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="status-text">
                      <div className="status-title">Recording Voice...</div>
                      <div className="status-subtitle">Speak now to analyze emotion</div>
                    </div>
                  </>
                )}
                {loading && !isRecording && (
                  <>
                    <div className="status-icon analyzing">
                      <span className="spinner-large"></span>
                    </div>
                    <div className="status-text">
                      <div className="status-title">
                        {analyzingType === 'voice' ? 'Analyzing Voice...' : 'Analyzing Text...'}
                      </div>
                      <div className="status-subtitle">
                        {analyzingType === 'voice' ? 'Processing audio through AI model' : 'Processing your input'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="input-section glass-effect">
            <div className="input-header">
              <label htmlFor="text-input" className="input-label">
                Enter your text
              </label>
              <span className="input-hint">Ctrl+Enter to analyze</span>
            </div>
            <textarea
              id="text-input"
              className="text-input"
              placeholder="Type or paste your text here... Express yourself freely!"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={6}
            />
            <div className="input-footer">
              <div className="char-count">{text.length} characters</div>
              <div className="button-group">
                <button
                  className={`voice-button ${isRecording ? 'recording' : ''}`}
                  onClick={handleVoiceInput}
                  disabled={loading}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pulse-icon">
                        <rect x="6" y="6" width="12" height="12" fill="currentColor" rx="2" />
                      </svg>
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 19V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Direct Voice
                    </>
                  )}
                </button>
                <button
                  className="analyze-button"
                  onClick={handleAnalyze}
                  disabled={loading || !text.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Analyze Emotion
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <div className="samples-section">
            <h3 className="samples-title">Try Sample Texts</h3>
            <div className="samples-grid">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  className="sample-card glass-effect"
                  onClick={() => handleSampleClick(sample)}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 8H17M7 12H17M7 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>{sample}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: result panel (always visible) */}
        <aside className="result-panel">
          {result ? (
            <div className="result-card-wrapper" style={{ '--emotion-color': getEmotionColor(result.emotion) }}>
              <div className="result-card-bg-blobs">
                <div className="result-bg-blob result-bg-blob-1" style={{ background: `radial-gradient(circle, ${getEmotionColor(result.emotion)}18 0%, transparent 70%)` }} />
                <div className="result-bg-blob result-bg-blob-2" style={{ background: `radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)` }} />
                <div className="result-bg-blob result-bg-blob-3" style={{ background: `radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)` }} />
              </div>
              <div
                className="result-card-modern emotion-reveal"
                data-emotion={(result.emotion || '').toLowerCase().trim()}
              >
                <div className="result-card-shimmer" />
                <div className="result-card-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${getEmotionColor(result.emotion)}28 0%, transparent 65%)` }} />
                <div className="result-header-modern">
                  <div
                    className="result-icon result-icon-emotion"
                    style={{
                      background: `linear-gradient(135deg, ${getEmotionColor(result.emotion)} 0%, ${getEmotionColor(result.emotion)}dd 100%)`,
                      boxShadow: `0 12px 32px ${getEmotionColor(result.emotion)}55, 0 0 0 1px ${getEmotionColor(result.emotion)}25`
                    }}
                  >
                    <span className="result-emotion-emoji" aria-hidden="true">{getEmotionSymbol(result.emotion)}</span>
                  </div>
                  <div className="result-content">
                    <div className="result-label-modern">{result.isVoice ? 'Voice Emotion' : 'Text Emotion'}</div>
                    <div
                      className="result-emotion-modern emotion-word"
                      style={{ color: getEmotionColor(result.emotion) }}
                    >
                      {getEmotionDisplayLabel(result.emotion)}
                    </div>
                  </div>
                </div>
                {result.text && (
                  <div className="result-text-block">
                    <div className="result-text">{result.text}</div>
                  </div>
                )}
                <div className="result-footer-modern">
                  <div className="result-meta">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <span>Analysis Complete</span>
                  </div>
                  {result.time_ms != null && (
                    <div className={`result-time ${result.isVoice ? 'result-time-voice' : 'result-time-text'}`}>
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span className="result-time-value">{result.time_ms} ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="result-placeholder">
              <div className="placeholder-orb placeholder-orb-1" />
              <div className="placeholder-orb placeholder-orb-2" />
              <div className="placeholder-orb placeholder-orb-3" />
              <div className="placeholder-dots">
                <span className="placeholder-dot" />
                <span className="placeholder-dot" />
                <span className="placeholder-dot" />
              </div>
              <div className="placeholder-icon-wrap">
                <svg className="placeholder-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="placeholder-title">Result will appear here</p>
              <p className="placeholder-subtitle">Analyze text or use voice to see the detected emotion</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default EmotionAnalyzer;
