import React from 'react';
import { useNavigate } from 'react-router-dom';
import TextAnalyzerUI from './TextAnalyzerUI';
import './VoiceAnalyzerPage.css';

function TextAnalyzerPage() {
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
        <div className="page-badge page-badge-text">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6C4.895 2 4 2.895 4 4V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Text Emotion Analysis
        </div>
      </header>
      <main className="analyzer-page-main">
        <TextAnalyzerUI />
      </main>
    </div>
  );
}

export default TextAnalyzerPage;

