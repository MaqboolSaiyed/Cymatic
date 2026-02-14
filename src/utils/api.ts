export interface GeneratedImage {
    data: string;      // base64
    mime_type: string;
}

export interface ProcessAudioResponse {
    diagram_type: string;
    nodes: { id: string; label: string; shape: string; category?: string }[];
    edges: { from: string; to: string; label?: string; style?: string }[];
    suggestions: string[];
    tts_response: string;
    image_prompt: string;
    generated_image?: GeneratedImage;
    transcription: string;
    thought_process: string;
    explanation: string;
}

const API_BASE_URL = 'http://localhost:8000';

export async function processAudio(audioBlob: Blob, currentState?: string): Promise<ProcessAudioResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    if (currentState) formData.append('current_state', currentState);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min for image gen

    try {
        const response = await fetch(`${API_BASE_URL}/process-audio`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out');
        throw error;
    }
}

export async function processText(instruction: string, currentState?: string): Promise<ProcessAudioResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(`${API_BASE_URL}/process-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instruction, current_state: currentState }),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Request timed out');
        throw error;
    }
}

export async function preloadTTS(text: string): Promise<HTMLAudioElement | null> {
    if (!text) return null;
    try {
        const response = await fetch(`${API_BASE_URL}/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data.audio && data.mime_type) {
            const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));

            const mime = data.mime_type as string;
            let blob: Blob;
            if (mime.includes('L16') || mime.includes('pcm') || mime.includes('raw')) {
                const rateMatch = mime.match(/rate=(\d+)/);
                const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
                const wavBytes = pcmToWav(audioBytes, sampleRate, 1, 16);
                blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
            } else {
                blob = new Blob([audioBytes.buffer as ArrayBuffer], { type: mime });
            }

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            audio.onerror = () => { console.warn('[CYMATIC] Audio playback error'); URL.revokeObjectURL(url); };
            return audio;
        }
        return null;
    } catch (err) {
        console.warn('[CYMATIC] TTS preload skipped:', err);
        return null;
    }
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): Uint8Array {
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    const headerSize = 44;
    const wav = new Uint8Array(headerSize + pcmData.length);
    const view = new DataView(wav.buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcmData.length, true);
    wav.set(pcmData, headerSize);

    return wav;
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
