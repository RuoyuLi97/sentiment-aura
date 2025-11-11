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
        // Error callback
        this.onErrorCallback = null;
        // Track manual/accidental disconnect
        this.isManualDisconnect = false;
    }

    // Connect to deepgram websocket
    connect(onTranscript, onError) {
        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError || (() => {});
        this.isManualDisconnect = false;
        this._createConnection();
    }

    // Setup connection
    _createConnection() {
        // Validate api key
        if (!DEEPGRAM_API_KEY) {
            const error = 'Deepgram API key is missing. Check your .env file!';
            console.error(error);
            this.onErrorCallback(error);
            return;
        }

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

        try {
            // Create websocket
            this.socket = new WebSocket(url, ['token', DEEPGRAM_API_KEY]);

            // Set timeout for connection
            const connectionTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    console.error('Deepgram connection timeout!');
                    this.socket.close();
                    this.onErrorCallback('Deepgram connection timeout! Please check your internet connection!');
                }
            }, 10000);
            
            this.socket.onopen = () => {
                clearTimeout(connectionTimeout);
                this.isConnected = true;
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (message) => {
                try {
                    const data = JSON.parse(message.data);

                    if (data.channel?.alternatives?.[0]){
                        const alternative = data.channel.alternatives[0];
                        const transcript = alternative.transcript;
                        const isFinal = data.is_final;

                        if (transcript?.trim()) {
                            this.onTranscriptCallback?.({
                                text: transcript,
                                isFinal: isFinal
                            });
                        }
                    }
                    
                    // Check error message from Deepgram
                    if (data.error) {
                        console.error('Deepgram API error: ', data.error);
                        this.onErrorCallback(`Transcription error: ${data.error}`);
                    }
                } catch (error) {
                    console.error('Error parsing Deepgram message: ', error);
                }
            };

            this.socket.onerror = (error) => {
                console.error('Deepgram WebSocket error: ', error);
                if (!this.isConnected) {
                    this.onErrorCallback('Failed to connect to Deepgram! Check API key and internet connection!');
                } else {
                    this.onErrorCallback('Connection error! Attempting to reconnect...');
                }
            };

            this.socket.onclose = (event) => {

                this.isConnected = false;
                clearTimeout(connectionTimeout);

                if(this.isManualDisconnect) {
                    return;
                }
                
                // Attempt reconnection if unexpected disconnect
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    
                    this.onErrorCallback(`Connection lost. Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

                    this.reconnectTimeout = setTimeout(() => {
                        this._createConnection();
                    }, 2000);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('Max reconnection attempts reached!');
                    this.onErrorCallback('Lost connection to transcription service! Please stop and refresh the page!');
                }
            };
        } catch (error) {
            console.error('Error creating WebSocket: ', error);
            this.onErrorCallback('Failed to initialize transcription service!')
        }
    }

    // Send audio data to deepgram
    send(audioData) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(audioData);
            } catch (error) {
                console.error('Error sending audio: ', error);
                this.onErrorCallback('Failed to send audio data!');
            }  
        } else {
            console.warn('WebSocket not ready! State: ', this.socket?.readyState);
        }
    }

    // Disconnect from Deepgram
    disconnect() {       
        this.isManualDisconnect = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.close(1000, 'Client disconnecting...');
            this.socket = null;
        }

        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
        
    }
}