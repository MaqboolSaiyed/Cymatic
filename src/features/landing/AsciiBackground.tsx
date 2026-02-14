import { useEffect, useRef } from 'react';

interface AsciiBackgroundProps {
    opacity?: number;
}

export function AsciiBackground({ opacity = 0.4 }: AsciiBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const characters = " .:-=+*#%@";
        const fontSize = 16;
        let columns = 0;
        let rows = 0;
        let particles: { x: number; y: number; char: string; intensity: number }[] = [];

        // Mouse state
        const mouse = { x: -1000, y: -1000 };

        function resize() {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            columns = Math.ceil(canvas.width / fontSize);
            rows = Math.ceil(canvas.height / fontSize);
            initParticles();
        }

        function initParticles() {
            particles = [];
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < columns; x++) {
                    particles.push({
                        x: x * fontSize,
                        y: y * fontSize,
                        char: characters[Math.floor(Math.random() * characters.length)],
                        intensity: Math.random() * 0.5, // Start with some visibility
                    });
                }
            }
        }

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = `${fontSize}px monospace`;

            particles.forEach((p) => {
                // Calculate distance to mouse
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = 200; // Interaction radius

                // Base change speed
                // let speed = 0.05;

                // Interaction: "Matrix Freeze" / Slow down near cursor
                if (distance < radius) {
                    // speed = 0.005; // Slow down (concept)

                    // Slight attraction/repulsion or turbulence can be added here
                    // For now, just brightening
                    const boost = 1 - (distance / radius);
                    p.intensity = Math.max(p.intensity, 0.5 + boost * 0.5); // Ensure visibility
                } else {
                    // Continuous random fluctuation
                    p.intensity += (Math.random() - 0.5) * 0.1;
                    p.intensity = Math.max(0, Math.min(p.intensity, 1)); // Clamp 0-1

                    // Natural decay to keep it subtle
                    p.intensity *= 0.98;

                    // Random rebirth
                    if (Math.random() < 0.005) p.intensity = 1;
                }

                // Cycle characters based on time/intensity
                // p.char = characters[Math.floor(Date.now() / 100) % characters.length]; // Too chaotic

                // Render if visible
                if (p.intensity > 0.05) {
                    const charIndex = Math.floor(p.intensity * (characters.length - 1));
                    const char = characters[Math.max(0, Math.min(charIndex, characters.length - 1))];

                    ctx.fillStyle = `rgba(0, 0, 0, ${p.intensity * opacity})`;
                    ctx.fillText(char, p.x, p.y + fontSize);
                }
            });

            requestAnimationFrame(animate);
        }

        // Event Listeners
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        resize();
        animate();

        return () => {
            window.removeEventListener('resize', resize);
        };
    }, [opacity]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}
