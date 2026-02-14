import os
import json
import base64
from typing import Dict, Optional
from fastapi import UploadFile
from google import genai
from google.genai import types

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        self.client = genai.Client(api_key=self.api_key)

    def _get_schema(self):
        return {
            "type": "object",
            "properties": {
                "transcription": {"type": "string"},
                "thought_process": {"type": "string"},
                "diagram_type": {"type": "string"},
                "tts_response": {"type": "string"},
                "image_prompt": {"type": "string"},
                "nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "shape": {"type": "string"},
                            "category": {"type": "string"}
                        },
                        "required": ["id", "label", "shape"]
                    }
                },
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "from": {"type": "string"},
                            "to": {"type": "string"},
                            "label": {"type": "string"},
                            "style": {"type": "string"}
                        },
                        "required": ["from", "to"]
                    }
                },
                "suggestions": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "explanation": {"type": "string"}
            },
            "required": ["transcription", "thought_process", "diagram_type", "tts_response", "image_prompt", "nodes", "edges", "suggestions", "explanation"]
        }

    def _get_base_prompt(self):
        return """You are Cymatic, an intelligent whiteboard assistant.

CAPABILITIES:
1. CREATE complex, production-grade diagrams from voice/text
2. ADD/REMOVE/MODIFY elements incrementally
3. TEXT NOTES with shape="note", category="note"
4. CONNECT existing elements by label matching
5. GENERATE IMAGES when user explicitly asks (set image_prompt field)

SHAPES: "rectangle", "ellipse", "diamond", "parallelogram", "note"
DIAGRAM TYPES: "flowchart", "er", "usecase", "class", "sequence", "mindmap", "freeform"
CATEGORIES: "entity"/"attribute"/"relationship" (ER), "actor"/"usecase" (UC), "class", "note", "default"
EDGE STYLES: "solid", "dashed"

IMAGE GENERATION (image_prompt field):
- If user says "generate an image of...", "add a picture of...", "draw an image of...", "create an illustration of..."
  → Set image_prompt to a detailed English prompt for the image generator (even if user spoke Hindi)
  → Make the prompt vivid and detailed for best results
  → Still output nodes/edges for any diagram parts
  → If ONLY asking for an image (no diagram), set nodes=[] and edges=[] 
- If user is NOT asking for image generation, set image_prompt to empty string ""

DIAGRAM QUALITY — THIS IS CRITICAL:
- Create VISUALLY RICH, well-structured diagrams that look professional
- Use VARIED SHAPES: mix rectangles, ellipses, diamonds, parallelograms — not all rectangles
- DESCRIPTIVE LABELS: "Validate User Credentials" not just "Validate", "Send Password Reset Email" not just "Email"
- MEANINGFUL EDGE LABELS: "on success", "if invalid", "1..N", "includes" — not empty
- Use CATEGORIES properly for color-coding (entity/attribute/actor/class/note)
- Include decision points (diamonds) with Yes/No branches in flowcharts
- Think like a senior designer creating a presentation-ready diagram
- 6-10 well-structured nodes is better than 15 shallow ones

TTS_RESPONSE — short spoken confirmation:
- MUST be in the SAME LANGUAGE the user spoke. If user spoke Hindi, respond in Hindi. If English, respond in English. If Hinglish, respond in Hinglish.
- Keep it under 15 words
- Examples (English): "Created a login flow with 12 steps", "Added forgot password branch"
- Examples (Hindi): "Maine login flow banaya hai 12 steps ke saath", "Forgot password add kar diya"
- For images: "Generating your image now" / "Aapki image bana raha hoon"
- Don't explain the diagram, just confirm what you did
- At the end, briefly mention ONE suggestion in the same language

SUGGESTIONS — GROUNDED and SPECIFIC:
Suggestions MUST reference specific things from the current diagram. DO NOT give generic suggestions.
BAD: "Add more nodes" or "Add error handling"  
GOOD: "Your login flow has no forgot password — add it" or "The Student entity is missing a GPA attribute"
Look at what EXISTS on the canvas and what the user JUST said, then identify specific gaps.
Each suggestion should be a short, actionable command (under 10 words).
Output exactly 3 suggestions.

RULES:
- Node IDs: simple strings "1","2","3" etc. Use high numbers for new nodes to avoid conflicts.
- When updating, KEEP all existing nodes/edges and ADD/MODIFY as instructed
- Output the COMPLETE diagram (existing + changes)
"""

    async def process_audio(self, audio_file: UploadFile, current_state: Optional[str] = None) -> Dict:
        audio_content = await audio_file.read()
        mime_type = audio_file.content_type or "audio/webm"
        
        print(f"[CYMATIC] Audio: {len(audio_content)} bytes, MIME: {mime_type}")

        prompt = self._get_base_prompt()
        if current_state and current_state.strip() and current_state.strip() != "{}":
            prompt += f"\n\nCURRENT CANVAS STATE (preserve and build upon this):\n{current_state}\nKeep ALL existing nodes/edges. Use IDs starting from 100+ for new nodes."
        else:
            prompt += "\nEmpty canvas. Create a new diagram from scratch. Make it DETAILED."
        prompt += "\nListen to the user's voice carefully. They may speak English, Hindi, Hinglish, or other languages."

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-pro",
                contents=[
                    types.Content(role="user", parts=[
                        types.Part.from_bytes(data=audio_content, mime_type=mime_type),
                        types.Part.from_text(text=prompt)
                    ])
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=self._get_schema()
                )
            )
            result = json.loads(response.text)
            print(f"[CYMATIC] Transcription: {result.get('transcription')}")
            print(f"[CYMATIC] Nodes: {len(result.get('nodes', []))}, Edges: {len(result.get('edges', []))}")
            print(f"[CYMATIC] Image prompt: {result.get('image_prompt', '')[:80]}")

            # If image_prompt is set, generate image with Imagen 4
            image_prompt = result.get("image_prompt", "").strip()
            if image_prompt:
                image_data = await self.generate_image(image_prompt)
                if image_data:
                    result["generated_image"] = image_data

            return result
        except Exception as e:
            print(f"[CYMATIC] Error: {e}")
            raise

    async def process_text(self, instruction: str, current_state: Optional[str] = None) -> Dict:
        print(f"[CYMATIC] Text: {instruction}")

        prompt = self._get_base_prompt()
        if current_state and current_state.strip() and current_state.strip() != "{}":
            prompt += f"\n\nCURRENT CANVAS STATE (preserve and build upon this):\n{current_state}\nKeep ALL existing nodes/edges. Use IDs starting from 100+ for new nodes."
        else:
            prompt += "\nEmpty canvas. Create a new diagram from scratch. Make it DETAILED."
        prompt += f"\n\nUSER INSTRUCTION: {instruction}"

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-pro",
                contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=self._get_schema()
                )
            )
            result = json.loads(response.text)
            result["transcription"] = instruction

            image_prompt = result.get("image_prompt", "").strip()
            if image_prompt:
                image_data = await self.generate_image(image_prompt)
                if image_data:
                    result["generated_image"] = image_data

            return result
        except Exception as e:
            print(f"[CYMATIC] Error (text): {e}")
            raise

    async def generate_image(self, prompt: str) -> Optional[Dict]:
        """Generate image using Imagen 4."""
        try:
            print(f"[CYMATIC] Generating image: {prompt[:80]}")
            response = self.client.models.generate_images(
                model="imagen-4.0-generate-001",
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                )
            )
            
            if response.generated_images and len(response.generated_images) > 0:
                image = response.generated_images[0].image
                image_b64 = base64.b64encode(image.image_bytes).decode("utf-8")
                print(f"[CYMATIC] Image generated: {len(image.image_bytes)} bytes")
                return {
                    "data": image_b64,
                    "mime_type": "image/png"
                }
            return None
        except Exception as e:
            print(f"[CYMATIC] Imagen error: {e}")
            return None

    async def generate_tts(self, text: str) -> Optional[Dict]:
        """Generate short TTS audio using Gemini 2.5 Flash TTS."""
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-preview-tts",
                contents=text,
                config=types.GenerateContentConfig(
                    response_modalities=["AUDIO"],
                    speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(
                            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                voice_name="Kore"
                            )
                        )
                    )
                )
            )
            
            audio_data = response.candidates[0].content.parts[0].inline_data
            audio_b64 = base64.b64encode(audio_data.data).decode("utf-8")
            print(f"[CYMATIC] TTS generated: {len(audio_data.data)} bytes")
            return {
                "audio": audio_b64,
                "mime_type": audio_data.mime_type
            }
        except Exception as e:
            print(f"[CYMATIC] TTS error: {e}")
            return None
