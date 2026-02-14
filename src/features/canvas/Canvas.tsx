import { useState, useRef, useEffect, useCallback } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import "@excalidraw/excalidraw/index.css";
import { FAB, type FabState } from './FAB';
import { motion, AnimatePresence } from 'framer-motion';
import { buildExcalidrawElements, type DiagramNode, type DiagramEdge } from '../../utils/diagramBuilder';
import { processAudio, processText, preloadTTS, type ProcessAudioResponse } from '../../utils/api';

interface CanvasProps {
    onBack?: () => void;
}

let imgIdCounter = 0;
function imgUid(): string {
    return `img_${Date.now()}_${imgIdCounter++}`;
}

const DIAGRAM_TYPE_LABELS: Record<string, string> = {
    flowchart: '📊 Flowchart',
    er: '🗄️ ER Diagram',
    usecase: '👤 Use Case',
    class: '🏗️ Class Diagram',
    sequence: '🔄 Sequence',
    mindmap: '🧠 Mind Map',
    freeform: '✏️ Freeform',
};

export function Canvas({ onBack }: CanvasProps) {
    const [fabState, setFabState] = useState<FabState>('idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const excalidrawRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const [statusText, setStatusText] = useState<string>('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [applyingSuggestion, setApplyingSuggestion] = useState<number | null>(null);
    const [diagramBadge, setDiagramBadge] = useState<string>('');
    const [textInput, setTextInput] = useState('');
    const [isTextProcessing, setIsTextProcessing] = useState(false);
    const textInputRef = useRef<HTMLInputElement>(null);
    const isTextFocusedRef = useRef(false);

    const currentDiagramRef = useRef<{
        nodes: DiagramNode[];
        edges: DiagramEdge[];
        diagram_type: string;
    } | null>(null);

    const cleanup = () => {
        mediaRecorderRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const addImageToCanvas = (imageData: string, mimeType: string) => {
        if (!excalidrawRef.current) return;
        const fileId = imgUid();
        const dataURL = `data:${mimeType};base64,${imageData}`;
        excalidrawRef.current.addFiles([{
            id: fileId, dataURL, mimeType,
            created: Date.now(), lastRetrieved: Date.now(),
        }]);
        const existingElements = excalidrawRef.current.getSceneElements() || [];
        let imgY = 50;
        if (existingElements.length > 0) {
            const maxY = Math.max(...existingElements.map((el: any) => (el.y || 0) + (el.height || 0)));
            imgY = maxY + 80;
        }
        excalidrawRef.current.updateScene({
            elements: [...existingElements, {
                id: imgUid(), type: 'image', x: 50, y: imgY,
                width: 512, height: 512, angle: 0,
                strokeColor: 'transparent', backgroundColor: 'transparent',
                fillStyle: 'solid', strokeWidth: 0, strokeStyle: 'solid',
                roughness: 0, opacity: 100, groupIds: [], roundness: null,
                isDeleted: false, boundElements: null, link: null, locked: false,
                fileId, scale: [1, 1] as [number, number],
                version: 1, versionNonce: Math.floor(Math.random() * 2147483647),
                status: 'saved',
            }],
        });
        setTimeout(() => {
            excalidrawRef.current?.scrollToContent(undefined, { fitToContent: true, animate: true, duration: 300 });
        }, 300);
    };

    const renderDiagram = (data: ProcessAudioResponse, ttsPromise?: Promise<HTMLAudioElement | null>) => {
        const hasNodes = data.nodes && data.nodes.length > 0;
        const hasImage = data.generated_image && data.generated_image.data;

        if (hasNodes) {
            const elements = buildExcalidrawElements(
                data.nodes as any, data.edges || [], data.diagram_type || 'flowchart'
            );
            if (excalidrawRef.current && elements.length > 0) {
                excalidrawRef.current.updateScene({ elements });
                setTimeout(() => {
                    excalidrawRef.current?.scrollToContent(undefined, { fitToContent: true, animate: true, duration: 300 });
                }, 300);
                currentDiagramRef.current = {
                    nodes: data.nodes, edges: data.edges,
                    diagram_type: data.diagram_type || 'flowchart',
                };
            }
        }

        if (hasImage) {
            setTimeout(() => {
                addImageToCanvas(data.generated_image!.data, data.generated_image!.mime_type);
            }, hasNodes ? 400 : 0);
        }

        // Badge
        const typeLabel = DIAGRAM_TYPE_LABELS[data.diagram_type] || data.diagram_type;
        if (data.diagram_type && data.diagram_type !== 'freeform') {
            setDiagramBadge(typeLabel);
        }

        setSuggestions(data.suggestions || []);

        if (ttsPromise) {
            ttsPromise.then(audio => audio?.play()).catch(() => { });
        }

        setStatusText('');
        return hasNodes || !!hasImage;
    };

    // ---- Text input handler ----
    const handleTextSubmit = async () => {
        const text = textInput.trim();
        if (!text || isTextProcessing) return;
        setIsTextProcessing(true);
        setTextInput('');
        setStatusText(`Processing: "${text}"`);

        try {
            const currentState = currentDiagramRef.current
                ? JSON.stringify(currentDiagramRef.current)
                : undefined;
            const data = await processText(text, currentState);
            const ttsPromise = data.tts_response ? preloadTTS(data.tts_response) : undefined;
            if (renderDiagram(data, ttsPromise)) {
                setStatusText('Done!');
                setTimeout(() => setStatusText(''), 2000);
            } else {
                setStatusText('No output generated.');
                setTimeout(() => setStatusText(''), 3000);
            }
        } catch (err: any) {
            setStatusText(`Error: ${err.message}`);
            setTimeout(() => setStatusText(''), 5000);
        } finally {
            setIsTextProcessing(false);
        }
    };

    // ---- Suggestion click ----
    const handleSuggestionClick = async (suggestion: string, index: number) => {
        if (applyingSuggestion !== null) return;
        setApplyingSuggestion(index);
        setStatusText(`Applying: "${suggestion}"`);
        try {
            const currentState = currentDiagramRef.current
                ? JSON.stringify(currentDiagramRef.current) : undefined;
            const data = await processText(suggestion, currentState);
            const ttsPromise = data.tts_response ? preloadTTS(data.tts_response) : undefined;
            if (renderDiagram(data, ttsPromise)) {
                setStatusText('Applied!');
                setTimeout(() => setStatusText(''), 2000);
            } else {
                setStatusText('No changes made.');
                setTimeout(() => setStatusText(''), 3000);
            }
        } catch (err: any) {
            setStatusText(`Error: ${err.message}`);
            setTimeout(() => setStatusText(''), 5000);
        } finally {
            setApplyingSuggestion(null);
        }
    };

    const handleExport = async () => {
        if (!excalidrawRef.current) return;
        try {
            const elements = excalidrawRef.current.getSceneElements();
            if (!elements || elements.length === 0) {
                setStatusText('Nothing to export.');
                setTimeout(() => setStatusText(''), 2000);
                return;
            }
            const blob = await exportToBlob({
                elements,
                appState: { ...excalidrawRef.current.getAppState(), exportWithDarkMode: false, exportBackground: true },
                files: excalidrawRef.current.getFiles(),
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cymatic-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatusText('Exported!');
            setTimeout(() => setStatusText(''), 2000);
        } catch {
            setStatusText('Export failed.');
            setTimeout(() => setStatusText(''), 3000);
        }
    };

    const handleNewDiagram = () => {
        currentDiagramRef.current = null;
        setSuggestions([]);
        setDiagramBadge('');
        if (excalidrawRef.current) {
            excalidrawRef.current.updateScene({ elements: [] });
            excalidrawRef.current.resetScene();
        }
        setStatusText('Canvas cleared.');
        setTimeout(() => setStatusText(''), 2000);
    };

    // ---- Recording ----
    const startRecording = useCallback(async () => {
        if (fabState !== 'idle') return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
            });
            streamRef.current = stream;
            audioChunksRef.current = [];

            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus' : 'audio/webm',
            });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
                audioChunksRef.current = [];
                cleanup();

                if (blob.size < 100) {
                    setStatusText('Recording too short.');
                    setFabState('idle');
                    setTimeout(() => setStatusText(''), 2000);
                    return;
                }

                try {
                    const hasDiagram = currentDiagramRef.current !== null;
                    setStatusText(hasDiagram ? 'Updating...' : 'Cymatic is thinking...');
                    const currentState = hasDiagram
                        ? JSON.stringify(currentDiagramRef.current) : undefined;
                    const data = await processAudio(blob, currentState);
                    const ttsPromise = data.tts_response ? preloadTTS(data.tts_response) : undefined;
                    if (renderDiagram(data, ttsPromise)) {
                        if (hasDiagram) {
                            setStatusText('Updated!');
                            setTimeout(() => setStatusText(''), 2000);
                        }
                    } else {
                        setStatusText('No output generated.');
                        setTimeout(() => setStatusText(''), 3000);
                    }
                } catch (err: any) {
                    setStatusText(`Error: ${err.message}`);
                    setTimeout(() => setStatusText(''), 5000);
                } finally {
                    setFabState('idle');
                }
            };

            recorder.start(250);
            mediaRecorderRef.current = recorder;
            setFabState('active');
            setSuggestions([]);
            const mode = currentDiagramRef.current ? '🔄 Edit mode' : '✨ New diagram';
            setStatusText(`Recording... ${mode}`);
        } catch {
            setStatusText('Microphone access denied.');
            setTimeout(() => setStatusText(''), 3000);
        }
    }, [fabState]);

    const stopRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            setFabState('processing');
            recorder.stop();
            mediaRecorderRef.current = null;
        } else {
            cleanup();
            setFabState('idle');
        }
    }, []);

    const handleFabClick = () => {
        if (fabState === 'idle') startRecording();
        else if (fabState === 'active') stopRecording();
    };

    // ---- Spacebar shortcut ----
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat && !isTextFocusedRef.current) {
                e.preventDefault();
                startRecording();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isTextFocusedRef.current) {
                e.preventDefault();
                stopRecording();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [startRecording, stopRecording]);

    return (
        <div className="relative h-screen w-full bg-background">
            <div className="absolute inset-0 z-0">
                <Excalidraw
                    excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
                    initialData={{
                        appState: {
                            viewBackgroundColor: "#ffffff",
                            currentItemFontFamily: 1,
                            gridSize: 20,
                        },
                    }}
                    UIOptions={{
                        canvasActions: {
                            changeViewBackgroundColor: true,
                            clearCanvas: true,
                            loadScene: true,
                            saveToActiveFile: true,
                            toggleTheme: true,
                            saveAsImage: true,
                        }
                    }}
                />
            </div>

            {/* Status */}
            {statusText && (
                <motion.div
                    key={statusText}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-16 left-1/2 -translate-x-1/2 z-[999] rounded-xl bg-black/80 px-5 py-2.5 text-white text-sm font-medium shadow-lg backdrop-blur pointer-events-none"
                >
                    {statusText}
                </motion.div>
            )}

            {/* Diagram type badge */}
            <AnimatePresence>
                {diagramBadge && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black/70 px-4 py-1.5 text-xs text-white font-medium backdrop-blur shadow-md"
                    >
                        {diagramBadge}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Suggestions — top right */}
            <AnimatePresence>
                {suggestions.length > 0 && fabState === 'idle' && applyingSuggestion === null && (
                    <motion.div
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="absolute top-16 right-4 z-[998] flex flex-col gap-2 max-w-xs"
                    >
                        <span className="text-xs text-gray-400 mb-0.5">💡 Click to apply:</span>
                        {suggestions.map((s, i) => (
                            <motion.button
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                disabled={applyingSuggestion !== null}
                                onClick={() => handleSuggestionClick(s, i)}
                                className={`rounded-lg px-3 py-2 text-xs text-left shadow-md backdrop-blur border transition-all
                                    ${applyingSuggestion === i
                                        ? 'bg-blue-100 border-blue-300 text-blue-700 animate-pulse'
                                        : 'bg-white/90 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 cursor-pointer'
                                    }
                                    ${applyingSuggestion !== null && applyingSuggestion !== i ? 'opacity-50' : ''}
                                `}
                            >
                                {applyingSuggestion === i ? '⏳ ' : '➕ '}{s}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Applying overlay */}
            {applyingSuggestion !== null && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute top-16 right-4 z-[998] rounded-lg bg-blue-50/90 border border-blue-200 px-4 py-3 text-xs text-blue-700 shadow-md backdrop-blur"
                >
                    ⏳ Applying suggestion...
                </motion.div>
            )}

            <FAB state={fabState} onClick={handleFabClick} />

            {/* Text input bar — bottom center */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[997] w-full max-w-lg px-4">
                <div className="flex items-center gap-2 rounded-2xl bg-white/90 border border-gray-200 shadow-lg backdrop-blur px-4 py-2">
                    <input
                        ref={textInputRef}
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onFocus={() => { isTextFocusedRef.current = true; }}
                        onBlur={() => { isTextFocusedRef.current = false; }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTextSubmit(); }}
                        placeholder="Type a command... (or hold Space to talk)"
                        disabled={isTextProcessing}
                        className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                    />
                    <button
                        onClick={handleTextSubmit}
                        disabled={!textInput.trim() || isTextProcessing}
                        className="rounded-lg bg-black/80 px-3 py-1.5 text-xs text-white font-medium hover:bg-black disabled:opacity-40 transition-all"
                    >
                        {isTextProcessing ? '⏳' : '→'}
                    </button>
                </div>
            </div>

            {/* Top bar */}
            <div className="absolute top-4 left-4 z-50 flex gap-2">
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-full bg-white/80 p-2 text-sm text-gray-500 shadow-sm backdrop-blur hover:bg-white transition-colors"
                    onClick={onBack}
                >
                    ← Exit
                </motion.button>
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-full bg-white/80 px-3 py-2 text-sm text-gray-500 shadow-sm backdrop-blur hover:bg-white transition-colors"
                    onClick={handleExport}
                >
                    📥 Export
                </motion.button>
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-full bg-white/80 px-3 py-2 text-sm text-gray-500 shadow-sm backdrop-blur hover:bg-white transition-colors"
                    onClick={handleNewDiagram}
                >
                    + New
                </motion.button>
            </div>
        </div>
    );
}
