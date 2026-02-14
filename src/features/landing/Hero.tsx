import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { WaveformGrid } from './WaveformGrid';
import { BlueprintOverlay } from './BlueprintOverlay';
// import { GeometricConstellations } from './GeometricConstellations';
import { CymaticButton } from '../../components/ui/CymaticButton';

const WORDS = [
    { text: "Structure.", lang: "English" },
    { text: "संरचना.", lang: "Hindi" },
    { text: "設計.", lang: "Japanese" },
    { text: "Design.", lang: "Hinglish" },
    { text: "ರಚನೆ.", lang: "Kannada" },
    { text: "నిర్మాణం.", lang: "Telugu" },
    { text: "அமைப்பு.", lang: "Tamil" },
    { text: "Structure.", lang: "French" },
    { text: "Estructura.", lang: "Spanish" },
    { text: "Struktur.", lang: "German" }
];

interface HeroProps {
    onStart: () => void;
}

export function Hero({ onStart }: HeroProps) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % WORDS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center overflow-hidden bg-[#FAFAFA] selection:bg-indigo-500/20">
            {/* Creative Background Mesh */}
            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-sky-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-violet-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-100/30 rounded-full blur-[120px]" />
            </div>

            <WaveformGrid />
            <BlueprintOverlay />
            {/* <GeometricConstellations /> - Removed as per user request */}

            {/* Project Logo */}
            <div className="absolute top-8 left-8 z-20 flex items-center gap-4">
                <span className="font-display font-bold text-xl tracking-wider text-foreground">CYMATIC.</span>
                <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground/5 border border-foreground/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-medium opacity-60 uppercase tracking-wider">
                        Multi-Lang-Model Active: {WORDS[index].lang}
                    </span>
                </div>
            </div>

            <div className="max-w-5xl space-y-12 z-10 font-sans">
                <h1 className="text-6xl font-bold tracking-tight text-foreground sm:text-8xl leading-none">
                    Turn Voice into<br />
                    {/* Added padding-top to prevent clipping of ascenders/accents */}
                    <div className="relative h-[1.2em] w-full flex justify-center overflow-hidden pt-3">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={index}
                                initial={{ y: 50, opacity: 0, rotateX: -90 }}
                                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                exit={{ y: -50, opacity: 0, rotateX: 90 }}
                                transition={{ duration: 0.6, ease: "backOut" }}
                                className="text-primary font-display tracking-wide absolute top-3" // Increased to top-3 (12px)
                            >
                                {WORDS[index].text}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </h1>

                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-2 text-2xl font-medium text-muted-foreground sm:text-3xl">
                        <span>The speed of thought, visualized.</span>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground/60 uppercase tracking-widest max-w-lg mx-auto">
                        From spoken word to technical blueprint in milliseconds.
                    </p>
                </div>

                <div className="pt-12">
                    <div onClick={onStart}>
                        <CymaticButton text="Start Architecting" />
                    </div>
                </div>
            </div>

            <footer className="absolute bottom-8 w-full max-w-6xl px-6 flex justify-between items-end text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-60 z-20">
                <div className="flex flex-col items-start gap-1">
                    <span>Made for</span>
                    <span className="text-foreground font-bold">Google DeepMind Hackathon</span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                    <span>&copy; Cymatic // Maqbool Saiyed</span>
                    <span className="text-[10px] opacity-70">All Systems Operational</span>
                </div>
            </footer>
        </div>
    );
}
