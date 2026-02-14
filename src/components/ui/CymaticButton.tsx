import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface CymaticButtonProps {
    text: string;
    onClick?: () => void;
    className?: string;
}

export function CymaticButton({ text, onClick, className = '' }: CymaticButtonProps) {
    return (
        <motion.button
            whileHover="hover"
            whileTap="tap"
            initial="idle"
            animate="idle"
            onClick={onClick}
            className={`group relative isolate inline-flex items-center gap-4 overflow-visible rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_100%] px-12 py-6 text-xl font-medium text-white transition-all hover:bg-[100%_0] shadow-[0_4px_20px_-5px_rgba(99,102,241,0.4)] ${className}`}
        >
            {/* Idle Harmonic State - "Breathing" field */}
            <motion.div
                variants={{
                    idle: {
                        scale: [1, 1.05, 1],
                        opacity: [0.3, 0.6, 0.3],
                        borderColor: ["rgba(99,102,241,0.2)", "rgba(168,85,247,0.2)", "rgba(99,102,241,0.2)"],
                        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    }
                }}
                className="absolute inset-0 rounded-full border-2 border-indigo-300/20"
            />

            {/* Active Cymatic Resonance - "High Visibility Prismatic Soundwaves" */}
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                {[
                    { color: "border-cyan-400", delay: 0 },
                    { color: "border-fuchsia-400", delay: 0.1 },
                    { color: "border-amber-400", delay: 0.2 },
                    { color: "border-emerald-400", delay: 0.3 }
                ].map((ring, i) => (
                    <motion.div
                        key={i}
                        variants={{
                            hover: {
                                scale: [1, 2.2 + i * 0.6], // Larger expansion
                                opacity: [0.8, 0], // Higher initial opacity
                                borderWidth: ["3px", "0px"], // Thicker borders
                                transition: {
                                    duration: 1.8, // Slightly faster for more energy
                                    repeat: Infinity,
                                    delay: ring.delay,
                                    ease: "easeOut"
                                }
                            },
                            tap: { scale: 0.95 },
                            idle: { opacity: 0 }
                        }}
                        className={`absolute inset-0 rounded-full border-2 ${ring.color} shadow-[0_0_15px_rgba(255,255,255,0.3)]`} // Added glow shadow
                    />
                ))}
            </div>

            <span className="font-mono min-w-[200px] text-center inline-block uppercase tracking-widest text-sm relative z-10 font-bold text-white/90 group-hover:text-white transition-colors drop-shadow-sm">
                {text}
            </span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 relative z-10 text-white/90 group-hover:text-white" />
        </motion.button>
    );
}
