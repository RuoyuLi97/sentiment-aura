import React, {useRef, useEffect} from 'react';
import p5 from 'p5';

function AuraVisualization({sentiment}) {
    const canvasRef = useRef(null);
    const p5Instance = useRef(null);
     const sentimentRef = useRef({score: 0, intensity: 0});

    useEffect(() => {
        sentimentRef.current = sentiment;
    }, [sentiment]);

    useEffect(() => {
        const sketch = (p) => {
            let particles = []
            let currentSentiment = {score: 0, intensity: 0};

            // Setup
            p.setup = () => {
                p.createCanvas(p.windowWidth, p.windowHeight);
                p.background(0, 0);
                p.colorMode(p.HSB, 360, 100, 100, 100);

                for (let i = 0; i < 10000; i++) {
                    const x = p.random(p.width);
                    const y = p.random(p.height);
                    particles.push({
                        pos: p.createVector(x, y),
                        vel: p.createVector(0, 0),
                        acc: p.createVector(0, 0),
                        prevPos: p.createVector(x, y),
                    });
                }
            };

            // Draw
            p.draw = () => {
                const targetSentiment = sentimentRef.current;

                currentSentiment.score = p.lerp(
                    currentSentiment.score,
                    targetSentiment.score || 0,
                    0.08
                );

                currentSentiment.intensity = p.lerp(
                    currentSentiment.intensity,
                    targetSentiment.intensity || 0,
                    0.08
                );
                
                p.fill(0, 2);
                p.noStroke();
                p.rect(0, 0, p.width, p.height);

                // Map sentiment to visual parameters
                const noiseScale = p.map(
                    currentSentiment.intensity, 
                    0, 1, 0.001, 0.006);

                const timeScale = p.map(
                    currentSentiment.intensity, 
                    0, 1, 0.0005, 0.002);

                const particleSpeed = p.map(
                    Math.abs(currentSentiment.score), 
                    0, 1, 0.8, 6);

                const accelerationScale = p.map(
                    Math.abs(currentSentiment.score), 
                    0, 1, 0.5, 1.2);

                // Color based on sentiment score
                let hue, saturation;
                if (currentSentiment.score < -0.3) {
                    hue = p.map(currentSentiment.score, -1, -0.3, 260, 220);
                    saturation = 85;
                } else if (currentSentiment.score < -0.1) {
                    hue = p.map(currentSentiment.score, -0.3, -0.1, 220, 200);
                    saturation = 75;               
                } else if (currentSentiment.score < 0) {
                    hue = p.map(currentSentiment.score, -0.1, 0, 200, 175);
                    saturation = 60;
                } else if (currentSentiment.score < 0.1) {
                    hue = p.map(currentSentiment.score, 0, 0.1, 285, 300);
                    saturation = 60;
                } else if (currentSentiment.score < 0.3) {
                    hue = p.map(currentSentiment.score, 0.1, 0.3, 300, 320);
                    saturation = 75;
                } else {
                    hue = p.map(currentSentiment.score, 0.3, 1, 320, 360);
                    saturation = 95;
                }

                // Update and draw each particle
                particles.forEach((particle, idx) => {
                    particle.prevPos.set(particle.pos);

                    // Single perline noise for angle
                    const nx = particle.pos.x * noiseScale;
                    const ny = particle.pos.y * noiseScale;
                    const nt = p.frameCount * timeScale;
                    const angle = p.noise(nx, ny, nt) * p.TWO_PI * 4;

                    particle.acc.set(p.cos(angle), p.sin(angle));
                    particle.acc.mult(accelerationScale);
                    particle.acc.add(p5.Vector.random2D().mult(0.1));
                    particle.vel.lerp(particle.acc, 0.2);
                    particle.vel.limit(particleSpeed);
                    particle.pos.add(particle.vel);
                    
                    // Edges
                    let wrapped = false;

                    if (particle.pos.x < 0) {
                        particle.pos.x = p.width;
                        particle.prevPos.x = p.width;
                        wrapped = true;
                    }
                    if (particle.pos.x > p.width) {
                        particle.pos.x = 0;
                        particle.prevPos.x = 0;
                        wrapped = true;
                    }
                    if (particle.pos.y < 0) {
                        particle.pos.y = p.height;
                        particle.prevPos.y = p.height;
                        wrapped = true;
                    }
                    if (particle.pos.y > p.height) {
                        particle.pos.y = 0;
                        particle.prevPos.y = 0;
                        wrapped = true;
                    }

                    if (wrapped) particle.prevPos.set(particle.pos);

                    // Draw particle trail
                    const alpha = p.map(
                        currentSentiment.intensity, 
                        0, 1, 40, 85
                    );

                    const brightness = p.map(
                        currentSentiment.intensity,
                        0, 1, 70, 95
                    );

                    p.stroke(hue, saturation, brightness, alpha);
                    p.strokeWeight(2);

                    p.line(
                        particle.prevPos.x,
                        particle.prevPos.y,
                        particle.pos.x,
                        particle.pos.y
                    );
                });
            };

            // Resize window
            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth, p.windowHeight);
            };
        };

        p5Instance.current = new p5(sketch, canvasRef.current);

        return () => {
            if (p5Instance.current) {
                p5Instance.current.remove();
            }
        };
    }, []);

    return (
        <div
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            pointerEvents: 'none',
            opacity: 0.85
          }}
        ></div>
    );
}

export default AuraVisualization;