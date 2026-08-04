import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

def get_ai_explanation(word: str):
    prompt = f"""
    You are a helpful dictionary assistant. I need you to explain the word "{word}".
    Provide the response strictly in the following JSON format:
    {{
        "simple_meaning": "A simple 1-2 sentence explanation.",
        "kid_friendly": "An explanation that a 5-year-old would understand.",
        "formal_meaning": "A very formal, dictionary-like definition.",
        "example": "A good sentence using the word."
    }}
    """
    try:
        response = model.generate_content(prompt)
        # Assuming the response is clean JSON
        import json
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}

def get_fallback_definition(word: str):
    prompt = f"""
    Provide the phonetic spelling and a clear, concise dictionary definition for the English word "{word}".
    Respond strictly in this JSON format:
    {{
        "phonetic": "The phonetic spelling (e.g. /həˈloʊ/)",
        "meaning": "A clear definition of the word."
    }}
    """
    try:
        response = model.generate_content(prompt)
        import json
        text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return {
            "word": word,
            "phonetic": data.get("phonetic", ""),
            "meaning": data.get("meaning", "Definition not available."),
            "audio": f"/api/tts/{word}"
        }
    except Exception as e:
        print("GEMINI FALLBACK ERROR:", repr(e))
        return {"error": "Word not found"}

def translate_word(word: str, target_language: str):
    prompt = f"Translate the word '{word}' into {target_language}. Respond with ONLY the translated word/phrase, nothing else."
    try:
        response = model.generate_content(prompt)
        return {"translation": response.text.strip()}
    except Exception as e:
        return {"error": str(e)}

def ai_chat(question: str, context: str):
    # Context could be the text extracted from the current page or entire PDF
    prompt = f"""
    Based on the following text extracted from a document, answer the user's question.
    
    Document Text:
    {context}
    
    Question:
    {question}
    """
    try:
        response = model.generate_content(prompt)
        return {"answer": response.text.strip()}
    except Exception as e:
        return {"error": str(e)}
