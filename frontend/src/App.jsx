import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import VoiceAnalyzerPage from './components/VoiceAnalyzerPage';
import TextAnalyzerPage from './components/TextAnalyzerPage';
import ModelMetrics from './components/ModelMetrics';
import './App.css';
import axios from 'axios';
import { apiUrl } from './lib/api.js';

function App() {
  // Single warm-up ping: fires once when the app loads so the first real prediction is fast
  useEffect(() => {
    axios.post(apiUrl('/api/predict'), { text: 'hello' }).catch(() => {});
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/voice" element={<VoiceAnalyzerPage />} />
        <Route path="/text" element={<TextAnalyzerPage />} />
        <Route path="/metrics" element={<ModelMetrics />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

