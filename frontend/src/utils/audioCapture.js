// Handle microphone access and audio processing
export class AudioCapture{
    constructor() {
        this.meidaRecorder = null;
        this.audioContext = null;
        this.stream = null;
        this.workletNode = null;
        this.source = null;
    }
    
    // Capture audio from microphone
    async start(onAudioData) {
        try {
            // Microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                }
            });

            // Audio context setup
            this.audioContext = new AudioContext({
                sampleRate: 16000
            })

            try {
                // Audio worklet processor
                await this.audioContext.audioWorklet.addModule(
                    URL.createObjectURL(new Blob([this.getWorkletProcessorCode()],
                    {type: 'application/javascript'}))
                );
            } catch (workletError) {
                throw new Error(`Failed to load audio processor: ${workletError.message}`);
            }
            
            // Audio processing
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
            this.workletNode.port.onmessage = (event) => {
                onAudioData(event.data);
            };

            // Connect audio chain from microphone to worklet to speaker
            this.source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);

            return {success: true, error: null};
        } catch (error) {
            console.error('Eroor accessing microphone: ', error);
            
            this.stop();

            let errorMessage = 'Failed to access microphone: ';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Microphone access denied. Please allow microphone access and refresh the page.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No microphone found. Please connect a microphone and try again.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microphone is already in use by another application (Zoom, Teams, etc.). Please close those apps and try again.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Your microphone does not support the required settings. Try using a different microphone or browser (Chrome/Edge recommended).';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Cannot access microphone due to browser security restrictions. Make sure you are using HTTPS or localhost.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Microphone access was interrupted. Please try again.';
            } else if (error.message.includes('audio processor')) {
                errorMessage = 'Failed to initialize audio processing. Your browser may not support AudioWorklet. Try updating your browser.';
            } else {
                errorMessage += error.message;
            }

            return {success: false, error: errorMessage};
        }
    }

    // Process processor code to string
    getWorkletProcessorCode() {
        return `
            class PCMProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.chunkCount = 0;
                }
                
                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    this.chunkCount++;

                    if (input && input.length > 0) {
                        const audioData = input[0];
                        
                        if (this.chunkCount % 100 === 0) {
                            const max = Math.max(...audioData);
                            const min = Math.min(...audioData);
                        }

                        const int16Data = new Int16Array(audioData.length);

                        for (let i = 0; i < audioData.length; i++) {
                            const s = Math.max(-1, Math.min(1, audioData[i]));
                            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }

                        this.port.postMessage(int16Data);
                    }
                    
                    return true;
                }
            }
            
            registerProcessor('pcm-processor', PCMProcessor);
        `;
    }

    stop() {
        // Disconnect audio nodes
        if (this.workletNode) {
            try {
                this.workletNode.disconnect();
                this.workletNode.port.close();
            } catch (error) {
                console.warn('Error disconnecting worklet: ', error);
            }  
            this.workletNode = null;
        }

        if (this.source) {
            try {
                this.source.disconnect();
            } catch (error) {
                console.warn('Error disconnecting source: ', error);
            }  
            this.source = null;
        }

        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (error) {
                console.warn('Error disconnecting audio context: ', error);
            } 
            this.audioContext = null;
        }

        // Stop microphone
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}