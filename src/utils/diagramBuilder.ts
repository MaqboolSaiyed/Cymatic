// Builds Excalidraw elements directly from nodes/edges — no Mermaid dependency.

export interface DiagramNode {
    id: string;
    label: string;
    shape: string;
    category?: string;
}

export interface DiagramEdge {
    from: string;
    to: string;
    label?: string;
    style?: string;
}

interface ExcalidrawElement {
    [key: string]: any;
}

let idCounter = 0;
function uid(): string {
    return `elem_${Date.now()}_${idCounter++}`;
}

const NODE_W = 220;
const NODE_H = 64;
const NOTE_W = 240;
const NOTE_H = 80;
const GAP_X = 100;
const GAP_Y = 120;

// Refined color palettes — richer, more polished
const PALETTES: Record<string, Record<string, string>> = {
    flowchart: {
        rectangle: '#d0bfff', ellipse: '#a5d8ff', diamond: '#fff3bf',
        parallelogram: '#c3fae8', note: '#fff9db', default: '#e9ecef',
    },
    er: {
        entity: '#a5d8ff', attribute: '#d0bfff', relationship: '#fff3bf',
        note: '#fff9db', default: '#e9ecef',
    },
    usecase: {
        actor: '#ffd8a8', usecase: '#a5d8ff', system: '#dee2e6',
        note: '#fff9db', default: '#d0bfff',
    },
    class: {
        class: '#d0bfff', interface: '#a5d8ff', note: '#fff9db', default: '#e9ecef',
    },
    freeform: {
        rectangle: '#d0bfff', ellipse: '#a5d8ff', diamond: '#fff3bf',
        note: '#fff9db', default: '#e9ecef',
    },
    sequence: { default: '#a5d8ff', note: '#fff9db' },
    mindmap: { default: '#d0bfff', note: '#fff9db' },
};

function getColor(diagramType: string, node: DiagramNode): string {
    const palette = PALETTES[diagramType] || PALETTES.flowchart;
    if (node.category === 'note') return palette.note || '#fff9db';
    if (node.category && palette[node.category]) return palette[node.category];
    if (palette[node.shape]) return palette[node.shape];
    return palette.default || '#e9ecef';
}

function baseElement(overrides: Partial<ExcalidrawElement>): ExcalidrawElement {
    return {
        id: uid(),
        type: 'rectangle',
        x: 0, y: 0,
        width: NODE_W, height: NODE_H,
        angle: 0,
        strokeColor: '#343a40',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 0,           // clean, polished look (no hand-drawn)
        opacity: 100,
        groupIds: [],
        roundness: { type: 3 },
        isDeleted: false,
        boundElements: null,
        link: null,
        locked: false,
        version: 1,
        versionNonce: Math.floor(Math.random() * 2147483647),
        ...overrides,
    };
}

function layoutNodes(nodes: DiagramNode[], edges: DiagramEdge[]) {
    const positions = new Map<string, { x: number; y: number }>();

    const diagramNodes = nodes.filter(n => n.category !== 'note' && n.shape !== 'note');
    const noteNodes = nodes.filter(n => n.category === 'note' || n.shape === 'note');

    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    diagramNodes.forEach(n => { incoming.set(n.id, []); outgoing.set(n.id, []); });
    edges.forEach(e => {
        incoming.get(e.to)?.push(e.from);
        outgoing.get(e.from)?.push(e.to);
    });

    const levels = new Map<string, number>();
    const roots = diagramNodes.filter(n => (incoming.get(n.id)?.length || 0) === 0);
    const startNodes = roots.length > 0 ? roots : (diagramNodes.length > 0 ? [diagramNodes[0]] : []);
    const queue: { id: string; level: number }[] = startNodes.map(n => ({ id: n.id, level: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
        const { id, level } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        levels.set(id, level);
        for (const next of outgoing.get(id) || []) {
            if (!visited.has(next)) queue.push({ id: next, level: level + 1 });
        }
    }
    diagramNodes.forEach(n => { if (!levels.has(n.id)) levels.set(n.id, 0); });

    const byLevel = new Map<number, string[]>();
    levels.forEach((level, id) => {
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level)!.push(id);
    });

    const maxLevel = Math.max(...byLevel.keys(), 0);
    for (let level = 0; level <= maxLevel; level++) {
        const nodesAtLevel = byLevel.get(level) || [];
        const totalWidth = nodesAtLevel.length * NODE_W + (nodesAtLevel.length - 1) * GAP_X;
        const startX = -totalWidth / 2;
        nodesAtLevel.forEach((id, i) => {
            positions.set(id, {
                x: startX + i * (NODE_W + GAP_X),
                y: level * (NODE_H + GAP_Y),
            });
        });
    }

    // Place notes to the right
    const rightEdge = Math.max(...Array.from(positions.values()).map(p => p.x + NODE_W), NODE_W);
    noteNodes.forEach((n, i) => {
        positions.set(n.id, {
            x: rightEdge + GAP_X + 60,
            y: i * (NOTE_H + 20),
        });
    });

    return positions;
}

export function buildExcalidrawElements(
    nodes: DiagramNode[],
    edges: DiagramEdge[],
    diagramType: string = 'flowchart'
): ExcalidrawElement[] {
    if (!nodes || nodes.length === 0) return [];

    const elements: ExcalidrawElement[] = [];
    const positions = layoutNodes(nodes, edges);
    const nodeElementIds = new Map<string, string>();

    for (const node of nodes) {
        const pos = positions.get(node.id) || { x: 0, y: 0 };
        const shapeId = uid();
        const textId = uid();
        const isNote = node.category === 'note' || node.shape === 'note';

        nodeElementIds.set(node.id, shapeId);

        let exType = 'rectangle';
        let roundness: { type: number } | null = { type: 3 };
        const bgColor = getColor(diagramType, node);
        let nodeW = NODE_W;
        let nodeH = NODE_H;

        if (isNote) {
            exType = 'rectangle';
            nodeW = NOTE_W;
            nodeH = Math.max(NOTE_H, node.label.length > 40 ? 100 : NOTE_H);
            roundness = { type: 3 };
        } else {
            switch (node.shape) {
                case 'ellipse':
                    exType = 'ellipse'; roundness = null; break;
                case 'diamond':
                    exType = 'diamond'; roundness = { type: 2 };
                    nodeW = NODE_W * 1.3; nodeH = NODE_H * 1.3; break;
                case 'parallelogram':
                    exType = 'rectangle'; break;
                default:
                    exType = 'rectangle'; break;
            }
        }

        elements.push(baseElement({
            id: shapeId,
            type: exType,
            x: pos.x, y: pos.y,
            width: nodeW, height: nodeH,
            backgroundColor: bgColor,
            fillStyle: 'solid',
            roundness,
            roughness: 0,
            strokeColor: isNote ? '#868e96' : '#343a40',
            strokeStyle: isNote ? 'dashed' : 'solid',
            strokeWidth: isNote ? 1 : 2,
            boundElements: [{ id: textId, type: 'text' }],
        }));

        elements.push(baseElement({
            id: textId,
            type: 'text',
            x: pos.x + 10,
            y: pos.y + nodeH / 2 - 10,
            width: nodeW - 20, height: 20,
            text: node.label,
            fontSize: isNote ? 13 : 16,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'middle',
            containerId: shapeId,
            originalText: node.label,
            autoResize: true,
            lineHeight: 1.25,
            backgroundColor: 'transparent',
            strokeColor: '#1e1e1e',
            roughness: 0,
            roundness: null,
        }));
    }

    for (const edge of edges) {
        const fromPos = positions.get(edge.from);
        const toPos = positions.get(edge.to);
        const fromElemId = nodeElementIds.get(edge.from);
        const toElemId = nodeElementIds.get(edge.to);
        if (!fromPos || !toPos || !fromElemId || !toElemId) continue;

        const startX = fromPos.x + NODE_W / 2;
        const startY = fromPos.y + NODE_H;
        const endX = toPos.x + NODE_W / 2;
        const endY = toPos.y;

        const arrowId = uid();
        elements.push(baseElement({
            id: arrowId,
            type: 'arrow',
            x: startX, y: startY,
            width: endX - startX, height: endY - startY,
            points: [[0, 0], [endX - startX, endY - startY]],
            startBinding: { elementId: fromElemId, focus: 0, gap: 5, fixedPoint: null },
            endBinding: { elementId: toElemId, focus: 0, gap: 5, fixedPoint: null },
            startArrowhead: null,
            endArrowhead: 'arrow',
            strokeColor: '#495057',
            strokeStyle: edge.style === 'dashed' ? 'dashed' : 'solid',
            strokeWidth: 2,
            roughness: 0,
            roundness: { type: 2 },
            backgroundColor: 'transparent',
        }));

        if (edge.label) {
            const labelId = uid();
            elements.push(baseElement({
                id: labelId,
                type: 'text',
                x: startX + (endX - startX) / 2 - 20,
                y: startY + (endY - startY) / 2 - 10,
                width: 40, height: 20,
                text: edge.label,
                fontSize: 12, fontFamily: 1,
                textAlign: 'center', verticalAlign: 'middle',
                containerId: arrowId,
                originalText: edge.label,
                autoResize: true, lineHeight: 1.25,
                backgroundColor: 'transparent',
                strokeColor: '#495057',
                roughness: 0,
                roundness: null,
            }));
        }
    }

    return elements;
}
