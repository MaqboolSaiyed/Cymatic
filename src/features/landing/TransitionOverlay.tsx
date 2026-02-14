import { motion } from 'framer-motion';
import { useEffect } from 'react';

export interface TransitionOverlayProps {
    onSwap: () => void;
    onComplete: () => void;
}

export function TransitionOverlay({ onSwap, onComplete }: TransitionOverlayProps) {
    useEffect(() => {
        // Total duration: ~1.4s
        // Peak (Swap) at: 0.6s
        const swapTimeout = setTimeout(onSwap, 600);
        const completeTimeout = setTimeout(onComplete, 1400);

        return () => {
            clearTimeout(swapTimeout);
            clearTimeout(completeTimeout);
        };
    }, [onSwap, onComplete]);

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Iris Wipe: Expands to cover, then shrinks to reveal */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 50, 50, 0] }}
                transition={{
                    duration: 1.4,
                    times: [0, 0.4, 0.5, 1], // Expand (40%), Hold (10%), Shrink (50%)
                    ease: "easeInOut"
                }}
                className="absolute w-24 h-24 rounded-full bg-foreground z-10"
            />

            {/* Text Fade In/Out at peak */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 1, 1, 0], scale: 1 }}
                transition={{ duration: 1.4, times: [0, 0.4, 0.6, 1] }}
                className="relative z-20 text-background font-display text-4xl font-bold tracking-widest uppercase"
            >
                Cymatic
            </motion.div>
        </div>
    );
}
