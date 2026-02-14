import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface ScrambleButtonProps {
    text: string;
    onClick?: () => void;
    className?: string; // Allow custom classes
}

const CYCLES_PER_LETTER = 2;
const SHUFFLE_TIME = 50;
const CHARS = "!@#$%^&*():{};|,.<>/?";

export function ScrambleButton({ text, onClick, className = "" }: ScrambleButtonProps) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [displayText, setDisplayText] = useState(text);

    const scramble = () => {
        let pos = 0;

        intervalRef.current = setInterval(() => {
            const scrambled = text.split("")
                .map((char, index) => {
                    if (index < pos) {
                        return char;
                    }
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                })
                .join("");

            setDisplayText(scrambled);
            pos += 1 / CYCLES_PER_LETTER;

            if (pos >= text.length) {
                stopScramble();
            }
        }, SHUFFLE_TIME);
    };

    const stopScramble = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={scramble}
            onMouseLeave={stopScramble}
            onClick={onClick}
            className={`group relative inline-flex items-center gap-3 rounded-full bg-foreground px-10 py-5 text-xl font-medium text-background transition-all hover:bg-primary hover:text-white ${className}`}
        >
            <span className="font-mono min-w-[180px] text-center inline-block uppercase tracking-widest text-sm">{displayText}</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </motion.button>
    );
}
