import React, {useEffect, useRef} from 'react';
import './TranscriptDisplay.css';

function TranscriptDisplay({transcript, currentLine}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [transcript, currentLine]);

    return (
        <div className='transcript-display'>
            <h2 className='section-title'>Transcript</h2>
            <div className='transcript-scroll-container' ref={containerRef}>
                <div className='transcript-content'>
                    {transcript.map((entry, idx) => (
                        <p key={idx} className='transcript-line fade-in'>
                            {entry.text}
                        </p>
                    ))}

                    {currentLine && (
                        <p className='transcript-line interim'>
                            {currentLine}
                        </p>
                    )}

                    {transcript.length === 0 && !currentLine && (
                        <p className='transcript-placeholder'>
                            Click "Start Recording and speak to see your transcript here..."
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TranscriptDisplay;