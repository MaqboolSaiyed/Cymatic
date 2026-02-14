import { useEffect, useRef } from 'react';

export function WaveformGrid() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gridSize = 40;
        let points: { x: number; y: number; originX: number; originY: number }[] = [];
        const mouse = { x: -1000, y: -1000 };

        function resize() {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            const cols = Math.ceil(canvas.width / gridSize) + 1;
            const rows = Math.ceil(canvas.height / gridSize) + 1;

            points = [];
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * gridSize;
                    const y = j * gridSize;
                    points.push({ x, y, originX: x, originY: y });
                }
            }
        }

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update points
            for (const p of points) {
                const dx = mouse.x - p.originX;
                const dy = mouse.y - p.originY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 300;

                if (dist < maxDist) {
                    const force = (maxDist - dist) / maxDist;
                    const angle = Math.atan2(dy, dx);
                    // Push points away
                    const move = force * 40;
                    p.x = p.originX - Math.cos(angle) * move;
                    p.y = p.originY - Math.sin(angle) * move;
                } else {
                    // Return to origin (damped spring)
                    p.x += (p.originX - p.x) * 0.1;
                    p.y += (p.originY - p.y) * 0.1;
                }
            }

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)'; // Very subtle chaotic lines
            ctx.lineWidth = 1;

            // Draw grid lines
            const cols = Math.ceil(canvas.width / gridSize) + 1;
            const rows = Math.ceil(canvas.height / gridSize) + 1;

            // Horizontal lines
            for (let j = 0; j < rows; j++) {
                ctx.beginPath();
                for (let i = 0; i < cols; i++) {
                    const index = i * rows + j;
                    if (points[index]) {
                        if (i === 0) ctx.moveTo(points[index].x, points[index].y);
                        else ctx.lineTo(points[index].x, points[index].y);
                    }
                }
                ctx.stroke();
            }

            // Vertical lines
            for (let i = 0; i < cols; i++) {
                ctx.beginPath();
                for (let j = 0; j < rows; j++) {
                    const index = i * rows + j;
                    if (points[index]) {
                        if (j === 0) ctx.moveTo(points[index].x, points[index].y);
                        else ctx.lineTo(points[index].x, points[index].y);
                    }
                }
                ctx.stroke();
            }

            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        });

        resize();
        animate();

        return () => window.removeEventListener('resize', resize);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
}
