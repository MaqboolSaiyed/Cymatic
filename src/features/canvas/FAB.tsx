import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2 } from 'lucide-react';

export type FabState = 'idle' | 'active' | 'processing';

interface FABProps {
    state: FabState;
    onClick: () => void;
}

export function FAB({ state, onClick }: FABProps) {
    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
                {state === 'processing' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="rounded-full bg-background/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md border border-border/50 shadow-sm"
                    >
                        Gemini is dreaming...
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={onClick}
                disabled={state === 'processing'}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all 
          ${state === 'idle' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
          ${state === 'active' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
          ${state === 'processing' ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
        `}
            >
                {/* Pulse Effect for Active State */}
                {state === 'active' && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-red-400 opacity-75"></span>
                )}

                <AnimatePresence mode="wait">
                    {state === 'idle' && (
                        <motion.div
                            key="mic"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                        >
                            <Mic className="h-8 w-8" />
                        </motion.div>
                    )}
                    {state === 'active' && (
                        <motion.div
                            key="stop"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                        >
                            <Square className="h-6 w-6 fill-current" />
                        </motion.div>
                    )}
                    {state === 'processing' && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>
        </div>
    );
}
