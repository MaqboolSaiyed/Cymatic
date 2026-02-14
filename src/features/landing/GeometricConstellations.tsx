import { motion } from 'framer-motion';

export function GeometricConstellations() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-multiply">
            {/* Circle 1 - Indigo/Violet */}
            <motion.div
                animate={{
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full border-[1.5px] border-indigo-500/40"
            />

            {/* Circle 2 - Rose/Pink (Dashed) */}
            <motion.div
                animate={{
                    x: [0, -40, 0],
                    y: [0, 60, 0],
                    rotate: [0, -360],
                    scale: [1, 0.9, 1]
                }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full border-[1.5px] border-dashed border-rose-500/40"
            />

            {/* Triangle/Shape - Amber */}
            <motion.div
                animate={{
                    rotate: [0, 180, 0],
                    x: [0, 30, 0]
                }}
                transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/3 right-1/3 h-32 w-32 border border-amber-500/30 rotate-45"
            />

            {/* Connecting Lines - Teal/Cyan */}
            <svg className="absolute inset-0 w-full h-full opacity-60">
                <motion.line
                    x1="20%" y1="20%" x2="80%" y2="80%"
                    stroke="url(#grad1)"
                    strokeWidth="1"
                    animate={{
                        x1: ["20%", "25%", "20%"],
                        x2: ["80%", "75%", "80%"]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Golden Ratio Rect - Violet */}
                <motion.rect
                    x="60%" y="20%" width="200" height="324"
                    fill="none"
                    stroke="rgba(139, 92, 246, 0.4)" // Violet-500
                    strokeWidth="1.5"
                    animate={{ rotate: 10, scale: [1, 1.05, 1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                />
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan */}
                        <stop offset="100%" stopColor="#8b5cf6" /> {/* Violet */}
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
