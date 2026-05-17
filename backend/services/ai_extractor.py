import asyncio
import base64
import json
import mimetypes
import os
from pathlib import Path
from typing import Any

from openai import OpenAI
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env", override=True)
load_dotenv(BACKEND_DIR / ".env.example")

# Using OpenRouter - GPT-4o mini has vision and is affordable
MODEL_NAME = "openai/gpt-4o-mini"

SUPPORTED_IMAGE_MEDIA_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

EXTRACTION_PROMPT = """
Extract structured operational data from this uploaded document.

IMPORTANT: If the document contains multiple rows/records, extract ONLY THE FIRST ROW.

Return ONLY a raw JSON object. Do not include markdown, code fences, comments,
preamble, or explanatory text. Do not wrap the response in a "data" array.

The JSON object must have exactly these fields:
- date: string in YYYY-MM-DD format or null
- shift: "A", "B", "C", or null
- employee_number: string or null
- operation_code: string or null
- machine_number: string or null
- work_order_number: string or null
- quantity_produced: integer or null
- time_taken: float number of hours or null
- confidence_scores: object mapping each extracted field name to a float from 0.0 to 1.0
- raw_notes: string containing any other text visible on the document, or null

Confidence scoring rules:
- 0.9-1.0: clearly legible
- 0.7-0.89: minor ambiguity
- 0.5-0.69: partially legible
- below 0.5: very unclear

Use null for fields that are missing or not readable. Do not guess unclear values.

Example response format:
{
  "date": "2026-04-20",
  "shift": "A",
  "employee_number": "BT4710",
  "operation_code": "856430",
  "machine_number": "MC-730",
  "work_order_number": "165460",
  "quantity_produced": 25,
  "time_taken": 4.0,
  "confidence_scores": {
    "date": 1.0,
    "shift": 1.0,
    "employee_number": 1.0,
    "operation_code": 1.0,
    "machine_number": 1.0,
    "work_order_number": 1.0,
    "quantity_produced": 1.0,
    "time_taken": 1.0
  },
  "raw_notes": null
}
""".strip()


def _encode_file(file_path: str) -> str:
    """Encode file to base64."""
    with open(file_path, "rb") as file:
        return base64.standard_b64encode(file.read()).decode("utf-8")


def _get_image_media_type(file_path: str) -> str:
    """Get the media type for an image file."""
    media_type, _ = mimetypes.guess_type(file_path)
    if media_type not in SUPPORTED_IMAGE_MEDIA_TYPES:
        suffix = Path(file_path).suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            return "image/jpeg"
        if suffix == ".png":
            return "image/png"
        if suffix == ".gif":
            return "image/gif"
        if suffix == ".webp":
            return "image/webp"
        raise ValueError(f"Unsupported image media type: {media_type or 'unknown'}")
    return media_type


def _empty_extraction_result(raw_response: str, error: str) -> dict[str, Any]:
    return {
        "date": None,
        "shift": None,
        "employee_number": None,
        "operation_code": None,
        "machine_number": None,
        "work_order_number": None,
        "quantity_produced": None,
        "time_taken": None,
        "confidence_scores": {},
        "raw_notes": None,
        "error": error,
        "raw_response": raw_response,
    }


def _parse_json_response(raw_response: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw_response)
    except json.JSONDecodeError:
        start = raw_response.find("{")
        end = raw_response.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return _empty_extraction_result(raw_response, "invalid_json_response")

        try:
            parsed = json.loads(raw_response[start : end + 1])
        except json.JSONDecodeError:
            return _empty_extraction_result(raw_response, "invalid_json_response")

    if not isinstance(parsed, dict):
        return _empty_extraction_result(raw_response, "json_response_not_object")

    # Handle case where AI returns {"data": [...]} with multiple records
    if "data" in parsed and isinstance(parsed["data"], list) and len(parsed["data"]) > 0:
        # Extract the first record from the array
        parsed = parsed["data"][0]

    return parsed


import requests

def _extract_document_sync(file_path: str, file_type: str) -> dict[str, Any]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not configured")
    api_key = api_key.strip()

    normalized_file_type = file_type.lower()
    encoded_file = _encode_file(file_path)
    
    if normalized_file_type == "image":
        media_type = _get_image_media_type(file_path)
        image_url = f"data:{media_type};base64,{encoded_file}"
    elif normalized_file_type == "pdf":
        image_url = f"data:application/pdf;base64,{encoded_file}"
    else:
        raise ValueError(f"Unsupported file_type: {file_type}")
    
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": image_url
                    }
                },
                {
                    "type": "text",
                    "text": EXTRACTION_PROMPT
                }
            ]
        }
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://optiscan-frontend.onrender.com",
        "X-Title": "OptiScan"
    }
    
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "max_tokens": 2048,
        "temperature": 0
    }
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=60
    )
    
    if not response.ok:
        raise RuntimeError(f"OpenRouter API error: {response.status_code} - {response.text}")
        
    response_data = response.json()
    raw_response = response_data["choices"][0]["message"]["content"].strip()
    return _parse_json_response(raw_response)

async def extract_document(file_path: str, file_type: str) -> dict:
    return await asyncio.to_thread(_extract_document_sync, file_path, file_type)
