import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(".env")

# Import the extraction function
from services.ai_extractor import extract_document

async def test():
    # Find a recent upload
    uploads_dir = Path("uploads")
    files = list(uploads_dir.glob("*.jpeg"))
    
    if not files:
        print("No files found in uploads directory")
        return
    
    # Test with the most recent file
    test_file = str(files[-1])
    print(f"Testing extraction on: {test_file}")
    print(f"OpenRouter API Key: {os.getenv('OPENROUTER_API_KEY')[:20]}...")
    
    try:
        result = await extract_document(test_file, "image")
        print("\n=== EXTRACTION RESULT ===")
        import json
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"\n=== ERROR ===")
        print(f"{type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
