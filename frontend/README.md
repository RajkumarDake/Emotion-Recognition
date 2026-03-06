# Anvitha - Emotion Recognition Frontend

A beautiful, modern React frontend for the Anvitha emotion recognition AI system.

## ✨ Features

- **Stunning UI/UX**: Modern dark theme with glassmorphism effects and smooth animations
- **Real-time Analysis**: Instant emotion detection from text input
- **Visual Feedback**: Emotion-specific colors, emojis, and probability bars
- **Sample Texts**: Quick-start examples to test the system
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **API Integration**: Seamless connection to the Flask backend

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Python backend running (see main README)

### Installation

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

## 🎨 Design Features

### Color Palette

- **Primary Gradient**: Purple to violet (#667eea → #764ba2)
- **Secondary Gradient**: Pink to red (#f093fb → #f5576c)
- **Success Gradient**: Blue to cyan (#4facfe → #00f2fe)
- **Dark Theme**: Deep space blues with glassmorphism

### Animations

- Fade-in effects on page load
- Smooth hover transitions
- Shimmer effects on progress bars
- Pulsing logo animation
- Floating particle background

### Typography

- **Font Family**: Inter (Google Fonts)
- Clean, modern, and highly readable
- Proper hierarchy with varied weights

## 📁 Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── Header.jsx
│   │   ├── Header.css
│   │   ├── EmotionAnalyzer.jsx
│   │   ├── EmotionAnalyzer.css
│   │   ├── Footer.jsx
│   │   └── Footer.css
│   ├── App.jsx          # Main app component
│   ├── App.css
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles & design system
├── index.html
├── package.json
└── vite.config.js
```

## 🔌 API Integration

The frontend connects to the Flask backend at `http://localhost:5000/api/predict`.

### API Request Format

```json
{
  "text": "Your text to analyze"
}
```

### API Response Format

```json
{
  "text": "Your text to analyze",
  "emotion": "joy",
  "confidence": 0.95,
  "probabilities": {
    "joy": 0.95,
    "sadness": 0.03,
    "anger": 0.01,
    "fear": 0.01
  }
}
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎯 Usage

1. **Enter Text**: Type or paste your text in the input area
2. **Analyze**: Click "Analyze Emotion" or press Ctrl+Enter
3. **View Results**: See the detected emotion with confidence score
4. **Explore Probabilities**: Check all emotion probabilities with visual bars
5. **Try Samples**: Click on sample texts for quick testing

## 🌟 Key Components

### EmotionAnalyzer

The main component that handles:

- Text input and validation
- API communication
- Result visualization
- Sample text suggestions

### Header

Navigation and branding with:

- Animated logo
- Gradient text effects
- Responsive navigation

### Footer

Information and links with:

- Social media icons
- Quick links
- Animated heart icon

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `src/index.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  /* ... more variables */
}
```

### Adding Emotions

Update the emotion mappings in `EmotionAnalyzer.jsx`:

```javascript
const emotionEmojis = {
  joy: "😊",
  your_emotion: "🎭",
  // ... add more
};
```

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1199px
- **Mobile**: < 768px

## 🚀 Production Build

1. Build the app:

```bash
npm run build
```

2. The optimized files will be in the `dist/` folder

3. Deploy to your hosting service (Vercel, Netlify, etc.)

## 🔧 Troubleshooting

### CORS Issues

Make sure the Flask backend has CORS enabled:

```python
from flask_cors import CORS
CORS(app)
```

### API Connection Failed

1. Verify the backend is running on port 5000
2. Check the proxy settings in `vite.config.js`
3. Ensure firewall allows local connections

### Styling Issues

1. Clear browser cache
2. Check for CSS conflicts
3. Verify all CSS files are imported

## 📄 License

Part of the Anvitha Emotion Recognition project.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ using React, Vite, and AI
