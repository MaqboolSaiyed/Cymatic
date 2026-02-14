from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional
from functools import lru_cache
from pydantic import BaseModel
from src.services.gemini_service import GeminiService

router = APIRouter()

@lru_cache()
def get_gemini_service():
    return GeminiService()

def _format(data: dict) -> dict:
    result = {
        "diagram_type": data.get("diagram_type", "flowchart"),
        "nodes": data.get("nodes", []),
        "edges": data.get("edges", []),
        "suggestions": data.get("suggestions", []),
        "tts_response": data.get("tts_response", ""),
        "image_prompt": data.get("image_prompt", ""),
        "transcription": data.get("transcription"),
        "thought_process": data.get("thought_process"),
        "explanation": data.get("explanation"),
    }
    # Pass through generated image if present
    if "generated_image" in data:
        result["generated_image"] = data["generated_image"]
    return result

@router.post("/process-audio")
async def process_audio(
    file: UploadFile = File(...),
    current_state: Optional[str] = Form(None),
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    try:
        data = await gemini_service.process_audio(file, current_state)
        return _format(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TextInstruction(BaseModel):
    instruction: str
    current_state: Optional[str] = None

@router.post("/process-text")
async def process_text(
    body: TextInstruction,
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    try:
        data = await gemini_service.process_text(body.instruction, body.current_state)
        return _format(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TTSRequest(BaseModel):
    text: str

@router.post("/tts")
async def text_to_speech(
    body: TTSRequest,
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    try:
        result = await gemini_service.generate_tts(body.text)
        if result:
            return result
        raise HTTPException(status_code=500, detail="TTS generation failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
