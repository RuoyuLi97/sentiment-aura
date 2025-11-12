# Sentiment Aura

Real-time emotion visualization powered by AI and Perlin noise flow fields.

## Overview

An interactive web application that captures live speech, transcribes it in real-time, analyzes sentiment using AI, and visualizes emotions through generative Perlin noise art. The visualization dynamically responds to emotional content - colors shift from cool blues (negative) to warm oranges (positive), and particle motion intensifies with emotional intensity.

## Demo

https://drive.google.com/file/d/1XIJFyOm7YMVTyYcAi8C3IddCOokCrs_Y/view?usp=sharing

## Features

- 🎤 **Real-time Speech Transcription** - Live audio capture with Deepgram's Nova-3 model
- 🤖 **AI Sentiment Analysis** - Groq LLM analyzes emotional tone and extracts keywords
- 🎨 **Dynamic Perlin Noise Visualization** - 10,000 particles flowing in organic patterns
- 🏷️ **Animated Keywords** - Smooth fade-in/fade-out transitions
- 🔄 **Auto-reconnection** - Handles network drops gracefully
- 📜 **Auto-scrolling Transcript** - Clean, readable conversation history

## Tech Stack

### Frontend
- **React** - UI framework
- **p5.js** - Perlin noise visualization
- **Web Audio API** - Microphone access via AudioWorklet
- **WebSocket** - Real-time Deepgram connection
- **Axios** - HTTP client for backend API

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client for LLM API

### External APIs
- **Deepgram** - Speech-to-text transcription (Nova-3 model)
- **Groq** - LLM sentiment analysis (Llama 3.1)

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    USER SPEAKS                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           REACT FRONTEND (localhost:3000)               │
│                                                         │
│  1. AudioWorklet captures mic (16kHz PCM)               │
│  2. WebSocket streams audio → Deepgram                  │
│  3. Receives transcript (interim + final)               │
│  4. On final → POST to backend                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ HTTP POST /process_text
┌─────────────────────────────────────────────────────────┐
│           FASTAPI BACKEND (localhost:8000)              │
│                                                         │
│  5. Receives text                                       │
│  6. Constructs prompt for LLM                           │
│  7. Calls Groq API                                      │
│  8. Returns JSON: {sentiment_score, type,               │
│                    intensity, keywords}                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ JSON Response
┌─────────────────────────────────────────────────────────┐
│                 REACT FRONTEND                          │
│                                                         │
│  9. Updates state (sentiment, keywords)                 │
│  10. React re-renders:                                  │
│      - Perlin noise shifts color/speed                  │
│      - Keywords fade in/out                             │
│      - Transcript updates                               │
└─────────────────────────────────────────────────────────┘
```

## Visual Design

### Sentiment → Color Mapping
- **Negative (-1.0 to -0.3):** Deep blue → Purple (cool tones)
- **Neutral (-0.3 to 0.3):** Purple → Pink (transitional)
- **Positive (0.3 to 1.0):** Orange → Yellow (warm tones)

### Sentiment → Motion Mapping
- **Intensity (0 to 1):** Controls particle speed and noise scale
- **High intensity:** Fast, chaotic, energetic flow
- **Low intensity:** Slow, calm, meditative movement

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Deepgram API key ([Get free $200 credits](https://console.deepgram.com/signup))
- Groq API key ([Free account](https://console.groq.com/))

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API keys
cp .env.example .env
# Edit .env and add: GROQ_API_KEY=your_groq_key_here

# Start server
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file with your API key
cp .env.example .env
# Edit .env and add: REACT_APP_DEEPGRAM_API_KEY=your_deepgram_key_here

# Start development server
npm start
```

Frontend will open at `http://localhost:3000`

## Usage

1. Click **"Start Recording"**
2. Allow microphone access when prompted
3. Speak naturally - try different emotional tones:
   - Positive: "I'm so excited about this amazing project!"
   - Negative: "This is really frustrating and difficult."
   - Neutral: "Let me think about the technical details."
4. Watch the visualization respond to your emotions
5. Click **"Stop"** when finished

## Project Structure
```
sentiment-aura/
├── backend/
│   ├── main.py              # FastAPI app with sentiment endpoint
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
└── frontend/
    ├── src/
    │   ├── App.js           # Main React component
    │   ├── components/
    │   │   ├── AuraVisualization.js    # Perlin noise p5.js canvas
    │   │   ├── KeywordsDisplay.js      # Animated keyword tags
    │   │   └── TranscriptDisplay.js    # Auto-scrolling transcript
    │   └── utils/
    │       ├── audioCapture.js         # AudioWorklet microphone capture
    │       └── deepgramService.js      # WebSocket transcription
    ├── package.json
    └── .env.example
```

## Key Implementation Details

### Audio Processing
- Uses **AudioWorklet** (modern replacement for deprecated ScriptProcessor)
- Captures at 16kHz sample rate (Deepgram requirement)
- Converts Float32 audio to Int16 PCM format
- Streams to Deepgram via WebSocket

### Sentiment Analysis
- Backend constructs structured prompt for Groq LLM
- Requests JSON response with sentiment score (-1 to 1), type, intensity, and keywords
- Error handling for timeout, parsing failures, and API errors

### Visualization
- 10,000 particles in Perlin noise flow field
- Smooth transitions via `lerp()` interpolation
- Particles respawn periodically to prevent clustering
- HSB color mode for smooth hue transitions

## Error Handling

- **Microphone denied:** Clear instructions to enable in browser settings
- **Backend offline:** Graceful degradation - transcript still works
- **Network drop:** Auto-reconnects up to 3 times with user feedback
- **API failures:** Specific error messages guide user to fix issues

## Known Limitations

- Sentiment analysis has ~2-3 second delay (LLM processing time)
- Requires modern browser with AudioWorklet support (Chrome/Edge recommended)
- Audio during network disconnection is lost (cannot buffer indefinitely)
- Best experienced on desktop/laptop

## Future Enhancements

- Sentiment history graph over time
- Multiple visualization modes (flow field, particles, waves)
- Export visualization as video
- Multi-language support
- Custom color palettes

## Development

**Run both servers concurrently:**
```bash
# Terminal 1 - Backend
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2 - Frontend  
cd frontend && npm start
```

## Acknowledgments

- Perlin noise flow field inspired by [Sighack](https://sighack.com/)
- Built as take-home assignment for **Memory Machines**

---

**Author:** Ruoyu Li  
**Date:** November 2024