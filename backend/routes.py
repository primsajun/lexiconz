from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from .dictionary import get_word_definition
from .ai import get_ai_explanation, translate_word, ai_chat
from .database import save_word, get_saved_words, save_pdf, delete_saved_word, register_user, login_user, update_reading_history, get_reading_history, delete_reading_history
from .pdf_reader import upload_pdf_to_storage
import shutil
import os
import requests

router = APIRouter()

@router.get("/config")
async def get_config():
    # Provide the public anon key to the frontend so it can upload files directly to Supabase, 
    # bypassing Vercel's strict 4.5MB serverless payload limit.
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_key": os.getenv("SUPABASE_KEY")
    }

@router.post("/save_pdf")
async def save_pdf_record(filename: str = Form(...), public_url: str = Form(...)):
    try:
        save_pdf(filename, public_url)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dictionary/{word}")
async def dictionary_lookup(word: str):
    data = get_word_definition(word)
    return data

@router.get("/ai/explain/{word}")
async def ai_explain(word: str):
    data = get_ai_explanation(word)
    return data

@router.post("/translate")
async def translate(word: str = Form(...), target_language: str = Form(...)):
    # Language code mapping
    lang_map = {
        "Tamil": "ta",
        "Hindi": "hi",
        "French": "fr",
        "Spanish": "es"
    }
    lang_code = lang_map.get(target_language, "es")
    
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={lang_code}&dt=t&q={word}"
    try:
        response = requests.get(url)
        data = response.json()
        translated_text = data[0][0][0]
        return {"translation": translated_text, "lang_code": lang_code}
    except Exception as e:
        return {"error": str(e)}

# --- Auth Routes ---
@router.post("/auth/register")
async def register(name: str = Form(...), email: str = Form(...), password: str = Form(...)):
    try:
        res = register_user(email, password, name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/login")
async def login(email: str = Form(...), password: str = Form(...)):
    try:
        res = login_user(email, password)
        return {
            "status": "success",
            "access_token": res.session.access_token,
            "user_id": res.user.id,
            "name": res.user.user_metadata.get("name", "User")
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials or error logging in")

# --- Vocabulary Routes ---
@router.post("/vocabulary")
async def add_vocabulary(
    user_id: str = Form(...),
    pdf_id: str = Form(""),
    word: str = Form(...),
    meaning: str = Form(...),
    translation: str = Form(""),
    language: str = Form("English"),
    page: int = Form(1)
):
    try:
        res = save_word(user_id, pdf_id, word, meaning, translation, language, page)
        return {"status": "success", "data": res.data if hasattr(res, 'data') else str(res)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vocabulary")
async def get_vocabulary(user_id: str):
    try:
        res = get_saved_words(user_id)
        return {"data": res.data if hasattr(res, 'data') else []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/vocabulary/{word_id}")
async def delete_vocabulary(word_id: str, user_id: str):
    try:
        res = delete_saved_word(word_id, user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- History Routes ---
@router.post("/history")
async def update_history(
    user_id: str = Form(...),
    pdf_id: str = Form(...),
    title: str = Form(...),
    file_url: str = Form(...),
    last_page: int = Form(...)
):
    try:
        res = update_reading_history(user_id, pdf_id, title, file_url, last_page)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/history")
async def get_history(user_id: str):
    try:
        res = get_reading_history(user_id)
        return {"data": res.data if hasattr(res, 'data') else []}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/history/{history_id}")
async def delete_history(history_id: str, user_id: str):
    try:
        res = delete_reading_history(history_id, user_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ai/chat")
async def chat_with_pdf(question: str = Form(...), context: str = Form(...)):
    res = ai_chat(question, context)
    return res

@router.get("/tts/{word}")
async def get_tts(word: str, lang: str = "en"):
    url = f"https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={lang}&q={word}"
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers, stream=True)
    return StreamingResponse(response.iter_content(chunk_size=1024), media_type="audio/mpeg")
