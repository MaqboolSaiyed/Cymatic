import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from src.main import app
from io import BytesIO

client = TestClient(app)

from src.routes.diagrams import get_gemini_service

@pytest.fixture
def mock_gemini_service():
    mock = MagicMock()
    # Mock async methods with AsyncMock
    mock.process_audio = AsyncMock()
    mock.generate_audio = AsyncMock()
    mock.update_diagram = AsyncMock()
    
    app.dependency_overrides[get_gemini_service] = lambda: mock
    yield mock
    app.dependency_overrides.clear()

def test_process_audio_endpoint(mock_gemini_service):
    # Setup mock return values
    mock_gemini_service.process_audio.return_value = {
        "mermaid_code": "graph TD; A-->B;",
        "explanation": "Test explanation",
        "transcription": "User said test",
        "thought_process": "Thinking..."
    }
    mock_gemini_service.generate_audio.return_value = "base64encodedaudio"

    # Create dummy audio file
    dummy_audio = BytesIO(b"fake audio content")
    files = {"file": ("test.mp3", dummy_audio, "audio/mp3")}

    response = client.post("/process-audio", files=files)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["diagram_code"] == "graph TD; A-->B;"
    assert json_response["audio_response_base64"] == "base64encodedaudio"
    assert json_response["transcription"] == "User said test"
    
    mock_gemini_service.process_audio.assert_called_once()
    mock_gemini_service.generate_audio.assert_called_once_with("Test explanation")

def test_process_audio_endpoint_no_explanation(mock_gemini_service):
    # Test case where explanation is empty (should not generate audio)
    mock_gemini_service.process_audio.return_value = {
        "mermaid_code": "graph TD; C-->D;",
        "explanation": ""
    }

    dummy_audio = BytesIO(b"fake audio content")
    files = {"file": ("test.mp3", dummy_audio, "audio/mp3")}

    response = client.post("/process-audio", files=files)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["diagram_code"] == "graph TD; C-->D;"
    assert json_response["audio_response_base64"] is None
    
    mock_gemini_service.generate_audio.assert_not_called()

def test_update_diagram_endpoint(mock_gemini_service):
    mock_gemini_service.update_diagram.return_value = {
        "mermaid_code": "graph TD; A-->B-->C;",
        "explanation": "Updated diagram"
    }

    dummy_audio = BytesIO(b"instruction audio")
    files = {"voice_instruction": ("instruction.mp3", dummy_audio, "audio/mp3")}
    data = {"current_code": "graph TD; A-->B;"}

    response = client.post("/update-diagram", files=files, data=data)

    assert response.status_code == 200
    json_response = response.json()
    assert json_response["mermaid_code"] == "graph TD; A-->B-->C;"
    
    # Verify call arguments
    mock_gemini_service.update_diagram.assert_called_once()
    # Note: Checking arguments for UploadFile is tricky with mocks, but we verify it was called.
