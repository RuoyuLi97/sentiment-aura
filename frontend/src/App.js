import React, {useState, useRef} from 'react';
import './App.css';
import AuraVisualization from './components/AuraVisualization';
import KeywordsDisplay from './components/KeywordsDisplay';
import TranscriptDisplay from './components/TranscriptDisplay';
import {AudioCapture} from './utils/audioCapture';
import {DeepgramService} from './utils/deepgramService';
import axios from 'axios';

function App() {
  // State management
  // Recording state
  const [isRecording, setIsRecording] = useState(false);

  // Transcript history
  const [transcript, setTranscript] = useState([]);

  // Current interim line
  const [currentLine, setCurrentLine] = useState('');

  // Sentiment analysis results
  const [sentiment, setSentiment] = useState({
    score: 0,
    type: 'neutral',
    intensity: 0
  });

  // Keywords
  const [keywords, setKeywords] = useState([]);

  // Error message
  const [error, setError] = useState(null);

  // Processing indicator
  const [isProcessing, setIsProcessing] = useState(false);

  // Service references
  // Microphone management
  const audioCaptureRef = useRef(null);

  // Transcripxtion websocket management
  const deepgramRef = useRef(null);

  // Transcript handler
  const handleTranscript = async(data) => {
    if (!data.isFinal) {
      setCurrentLine(data.text);
    } else{
      if (data.text.trim()) {
        // Add to transcript history
        setTranscript(prev => [...prev, {
          text: data.text,
          timestamp: Date.now()
        }]);

        // Clear interim preview
        setCurrentLine('');

        // Send to backend for sentiment analysis
        setIsProcessing(true);
        setError(null);

        try {
          const response = await axios.post(
            'http://localhost:8000/process_text',
            {text: data.text},
            {timeout: 10000}
          );

          // Update sentiment state
          setSentiment({
            score: response.data.sentiment_score,
            type: response.data.sentiment_type,
            intensity: response.data.intensity
          });

          // Update keywords
          setKeywords(response.data.keywords);
        } catch (error) {
          console.error('Error processing sentiment: ', error);

          if (error.code === 'ECONNABORTED'){
            setError('Backend timeout - is the server running?');
          } else if (error.response) {
            setError(`Backend error: ${error.response.status}`);
          } else if (error.request) {
            setError('Cannot reach backend - check if server is running on port 8000.');
          } else {
            setError('Failed to analyze sentiment.');
          }
        } finally {
          setIsProcessing(false);
        }
      }
    }
  };

  // Record Workflow
  const handleStart = async() => {
   // Reset state
    setError(null);
    setTranscript([]);
    setCurrentLine('');
    setKeywords([]);

    // Initialize service
    audioCaptureRef.current = new AudioCapture();
    deepgramRef.current = new DeepgramService();

    // Connect to deepgram websocket with error handling
    deepgramRef.current.connect(
      handleTranscript,
      (errorMsg) => {
        console.error('Deepgram error: ', errorMsg);
        setError(errorMsg);
      }
    );

    // Wait for websocket to connect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start microphone capture
    const result = await audioCaptureRef.current.start((audioData) => {
      if (deepgramRef.current) {
        deepgramRef.current.send(audioData);
      }
    });

    // Handle success/fail
    if (result.success) {
      setIsRecording(true);
    } else {
      setError('Failed to access microphone.');
      setError(result.error);

      if (deepgramRef.current) {
        deepgramRef.current.disconnect();
        deepgramRef.current = null;
      }

      if (audioCaptureRef.current) {
        audioCaptureRef.current.stop();
        audioCaptureRef.current = null;
      }
    }
  };

  // Stop record
  const handleStop = () => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
      audioCaptureRef.current = null;
    }

    if (deepgramRef.current) {
      deepgramRef.current.disconnect();
      deepgramRef.current = null;
    }

    setIsRecording(false);
    setCurrentLine('');
  };

  return (
    <div className='App'>
      {/* Perlin Noise Background */}
      <AuraVisualization sentiment={sentiment} />
      
      {/* UI Overlay */}
      <div className="container">
        <h1>Sentiment Aura</h1>
        
        {/* Error display */}
        {error && (
          <div className='error-message'>
            {error}
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="processing-indicator">
            Analyzing sentiment...
          </div>
        )}

        {/* Controls */}
        <div className='controls'>
          {!isRecording ? (
            <button className='start-btn' onClick={handleStart}>
              Start Recording
            </button>
          ) :(
            <>
              <div className='recording-indicator'>
                <span className='pulse-dot'></span>
                Recording...
              </div>
              <button className='stop-btn' onClick={handleStop}>
                Stop
              </button>
            </>
          )}
        </div>

        {/* Transcript display */}
        <TranscriptDisplay
          transcript={transcript}
          currentLine={currentLine}
        />

        {/* Sentiment display */}
        <div className='sentiment-section'>
          <h2>Sentiment Analysis</h2>
          <div className='sentiment-display'>
            <div className='sentiment-item'>
              <span className='label'>Score:</span>
              <span className='value'>{sentiment.score.toFixed(2)}</span>
            </div>
            <div className='sentiment-item'>
              <span className='label'>Type:</span>
              <span className={`value ${sentiment.type}`}>{sentiment.type}</span>
            </div>
            <div className='sentiment-item'>
              <span className='label'>Intensity:</span>
              <span className='value'>{sentiment.intensity.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Keywords display */}
        <div className="keywords-section">
          <h2>Keywords</h2>
          <KeywordsDisplay keywords={keywords} />
        </div>
      </div>
    </div>
  );
}

export default App;