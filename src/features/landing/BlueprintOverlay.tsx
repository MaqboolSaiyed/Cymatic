export function BlueprintOverlay() {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
            {/* Grid Lines */}
            <svg className="absolute inset-0 w-full h-full stroke-gray-300/20" width="100%" height="100%">
                <defs>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Crosshairs */}
            <div className="absolute top-10 left-10 w-4 h-4 border-l border-t border-gray-400/40" />
            <div className="absolute top-10 right-10 w-4 h-4 border-r border-t border-gray-400/40" />
            <div className="absolute bottom-10 left-10 w-4 h-4 border-l border-b border-gray-400/40" />
            <div className="absolute bottom-10 right-10 w-4 h-4 border-r border-b border-gray-400/40" />

            {/* Measurement Markers */}
            <div className="absolute top-1/2 left-4 h-32 w-px bg-gradient-to-b from-transparent via-gray-400/30 to-transparent"></div>
            <div className="absolute top-1/2 right-4 h-32 w-px bg-gradient-to-b from-transparent via-gray-400/30 to-transparent"></div>

            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-8 text-[10px] font-mono text-gray-400/40 tracking-widest uppercase">
                <span>Scale: 1:1</span>
                <span>Grid: 100px</span>
                <span>Cymatic.AI</span>
            </div>
        </div>
    );
}
