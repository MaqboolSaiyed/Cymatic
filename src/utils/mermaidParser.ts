import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";

export async function convertMermaidToScene(mermaidDefinition: string) {
    try {
        const { elements } = await parseMermaidToExcalidraw(mermaidDefinition);
        return elements;
    } catch (error) {
        console.error("Mermaid conversion failed:", error);
        return [];
    }
}
