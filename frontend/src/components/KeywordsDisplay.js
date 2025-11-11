import React, {useEffect, useState} from 'react';
import './KeywordsDisplay.css';

function KeywordsDisplay({keywords}) {
    const [displayedKeywords, setDisplayedKeywords] = useState([]);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        // Handle empty keywords
        if (!keywords || keywords.length === 0) {
            setDisplayedKeywords([]);
            setIsFadingOut(false);
            return;
        }

        setIsFadingOut(true);

        const timeoutIds = [];

        // Clear after fade
        const clearTimeoutId = setTimeout(() => {
            setDisplayedKeywords([]);
            setIsFadingOut(false);
        }, 400);

        timeoutIds.push(clearTimeoutId);

        // Fade in new keywords
        keywords.forEach((keyword, idx) => {
            const timeoutId = setTimeout(() => {
                setDisplayedKeywords(prev => [
                    ...prev,
                    {
                        text: keyword,
                        id: `${Date.now()}-${idx}-${Math.random()}`
                    }
                ]);
            }, 400 + idx * 250);

            timeoutIds.push(timeoutId);
        });

        // Cleanup
        return () => {
            timeoutIds.forEach(id => {
                if (typeof id === 'number') {
                    clearTimeout(id);
                }
            });
        };
    }, [keywords]);

    return (
        <div className='keywords-display-wrapper'>
            {displayedKeywords.length > 0 ? (
                displayedKeywords.map((keyword) => (
                    <span
                        key={keyword.id}
                        className={`keyword-tag ${isFadingOut ? 'keyword-fade-out' : 'keyword-fade-in'}`}
                    >
                        {keyword.text}
                    </span>
                ))
            ) : (
                <p className='placeholder'>Keywords will appear here...</p>
            )}
        </div>
    );
}

export default KeywordsDisplay;