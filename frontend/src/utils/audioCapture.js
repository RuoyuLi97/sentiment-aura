// Handle microphone access and audio processing
export class AudioCapture{
    constructor() {
        this.meidaRecorder = null;
        this.audioContext = null;
        this.stream = null;
        this.processor = null;
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

            // Audio worklet processor
            await this.audioContext.audioWorklet.addModule(
                URL.createObjectURL(new Blob([this.getWorkletProcessorCode()],
                {type: 'application/javascript'}))
            );

            // Audio processing
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
            this.workletNode.port.onmessage = (event) => {
                onAudioData(event.data);
            }

            // Connect audio chain from microphone to worklet to speaker
            this.source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);

            console.log('Audio capture started!');
            return true;
        } catch (error) {
            console.error('Eroor accessing microphone: ', error);

            if (error.name === 'NotAllowedError') {
                alert('Microphone access denied! Please allow microphone access and try again!');
            } else if (error.name === 'NotFoundError') {
                alert('No microphone found! Please connect a microphone and try again!');
            } else {
                alert('Failed to access microphone: ' + error.message + "!");
            }

            return false;
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
                    if (this.chunkCount % 100 === 0) {
                        console.log('Worklet processed', this.chunkCount, 'chunks!');
                    }
                    if (input && input.length > 0) {
                        const audioData = input[0];
                        
                        if (this.chunkCount % 100 === 0) {
                            const max = Math.max(...audioData);
                            const min = Math.min(...audioData);
                            console.log('Audio range:', min, 'to', max);
                        }

                        const int16Data = new Int16Array(audioData.length);

                        for (let i = 0; i < audioData.length; i++) {
                            const s = Math.max(-1, Math.min(1, audioData[i]));
                            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }

                        this.port.postMessage(int16Data);
                    } else {
                        if (this.chunkCount === 1) {
                            console.log('No input channels!');
                        }
                    }
                    
                    return true;
                }
            }
            
            registerProcessor('pcm-processor', PCMProcessor);
        `;
    }

    stop() {
        console.log('Stopping audio capture!');

        // Disconnect audio nodes
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode.port.close();
            this.workletNode = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Stop microphone
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        console.log('Audio capture stopped!');
    }
}