import React from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceAnalyzerUI from './VoiceAnalyzerUI';
import './VoiceAnalyzerPage.css';

function VoiceAnalyzerPage() {
  const navigate = useNavigate();
  return (
    <div className="analyzer-page">
      <header className="analyzer-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Home
        </button>
        <div className="page-badge page-badge-voice">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M19 10V12C19 15.866 15.866 19 12 19C8.134 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Voice Emotion Analysis
        </div>
      </header>
      <main className="analyzer-page-main">
        <VoiceAnalyzerUI />
      </main>
    </div>
  );
}

export default VoiceAnalyzerPage;

