# Sentiment Aura

Real-time emotion visualization powered by AI and Perlin noise.

## Overview
An interactive web application that captures live speech, transcribes it in real-time, analyzes sentiment using AI, and visualizes emotions through generative art.

**Status:** 🚧 In Development

## Tech Stack
- **Frontend:** React, p5.js (Perlin noise visualization)
- **Backend:** FastAPI (Python)
- **APIs:** 
  - Deepgram (real-time speech-to-text)
  - Groq (LLM sentiment analysis)

## Architecture
```
Browser → Microphone → Deepgram → Transcript
                                      ↓
                            Backend (FastAPI)
                                      ↓
                              Groq API (LLM)
                                      ↓
                    Sentiment + Keywords JSON
                                      ↓
                      React State Update
                                      ↓
              Perlin Noise Visualization Update
```

## Setup Instructions
Coming soon...

---
**Take-home assignment for Memory Machines**  
Submitted by: Ruoyu Li
Date: November 2025