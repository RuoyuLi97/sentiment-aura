const DEEPGRAM_API_KEY = process.env.REACT_APP_DEEPGRAM_API_KEY;
const DEEPGRAM_URL= 'wss://api.deepgram.com/v1/listen';

export class DeepgramService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.onTranscriptCallback = null;
        this.reconnectTimeout = null;
    }

    // Connect to deepgram websocket
    connect(onTranscript) {
        this.onTranscriptCallback = onTranscript;
        this._createConnection();
    }

    // Setup connection
    _createConnection() {
        const params = new URLSearchParams({
            model: 'nova-3',
            language: 'en-US',
            punctuate: 'true',
            smart_format: 'true',
            interim_results: 'true',
            endpointing: '300',
            encoding: 'linear16',
            sample_rate: '16000' 
        });

        const url = `${DEEPGRAM_URL}?${params.toString()}`;
        console.log('Connecting to Deepgram Nova-3...');

        // Create websocket
        this.socket = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

        this.socket.onopen = () => {
            console.log('Deepgram connected (Nova-3 model active)!');
            this.isConnected = true;
            this.reconnectAttempts = 0;
        };

        this.socket.onmessage = (message) => {
            console.log('Raw Deepgram message: ', message.data);
            try {
                const data = JSON.parse(message.data);

                console.log('Parsed data: ', data);
                if (data.channel?.alternatives?.[0]){
                    const alternative = data.channel.alternatives[0];
                    const transcript = alternative.transcript;
                    const isFinal = data.is_final;

                    console.log('Transcript found: ', {
                        text: transcript,
                        length: transcript?.length,
                        isFinal: isFinal,
                        trimmed: transcript?.trim()
                    });

                    if (transcript?.trim()) {
                        this.onTranscriptCallback?.({
                            text: transcript,
                            isFinal: isFinal
                        });
                    } else {
                        console.log('Transcript empty or whitespace only!');
                    }
                } else {
                    console.log('No alternatives in data!');
                }
            } catch (error) {
                console.error('Error parsing Deepgram message: ', error);
            }
        };

        this.socket.onerror = (error) => {
            console.error('Deepgram WebSocket error: ', error);
        }

        this.socket.onclose = (event) => {
            console.log('Deepgram disconnected!', event.code, event.reason);
            this.isConnected = false;

            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

                this.reconnectTimeout = setTimeout(() => {
                    this._createConnection();
                }, 2000);
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached!');
                alert('Lost connection to transcription service! Please refresh the page!');
            }
        };
    }

    // Send audio data to deepgram
    send(audioData) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            console.log('Sending to Deepgram: ', audioData.length, 'samples!');
            this.socket.send(audioData);
        } else {
            console.warn('WebSocket not ready! State: ', this.socket?.readyState);
        }
    }

    // Disconnect from Deepgram
    disconnect() {
        console.log('Disconnecting from Deepgram!');
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Client disconnecting...');
            this.socket = null;
        }

        this.isConnected = false;
        this.onTranscriptCallback = null;
        
        console.log('Deepgram disconnected!');
    }

}