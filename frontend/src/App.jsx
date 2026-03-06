import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import VoiceAnalyzerPage from './components/VoiceAnalyzerPage';
import TextAnalyzerPage from './components/TextAnalyzerPage';
import ModelMetrics from './components/ModelMetrics';
import './App.css';

function App() {
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

