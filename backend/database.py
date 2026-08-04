import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

# Auth Functions
def register_user(email: str, password: str, name: str):
    res = supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "name": name
            }
        }
    })
    return res

def login_user(email: str, password: str):
    res = supabase.auth.sign_in_with_password({
        "email": email,
        "password": password
    })
    return res

# Vocabulary Functions
def save_word(user_id: str, pdf_id: str, word: str, meaning: str, translation: str, language: str, page: int):
    data = {
        "user_id": user_id,
        "pdf_id": pdf_id,
        "word": word,
        "meaning": meaning,
        "translation": translation,
        "language": language,
        "page": page
    }
    response = supabase.table("saved_words").insert(data).execute()
    return response

def get_saved_words(user_id: str):
    response = supabase.table("saved_words").select("*").eq("user_id", user_id).execute()
    return response

def delete_saved_word(word_id: str, user_id: str):
    response = supabase.table("saved_words").delete().eq("id", word_id).eq("user_id", user_id).execute()
    return response

# PDF Functions
def save_pdf(title: str, file_url: str):
    data = {
        "title": title,
        "file_url": file_url
    }
    response = supabase.table("pdfs").insert(data).execute()
    return response

# History Functions
import datetime

def update_reading_history(user_id: str, pdf_id: str, title: str, file_url: str, last_page: int):
    existing = supabase.table("reading_history").select("*").eq("user_id", user_id).eq("pdf_id", pdf_id).execute()
    if existing.data and len(existing.data) > 0:
        response = supabase.table("reading_history").update({
            "last_page": last_page,
            "last_accessed": datetime.datetime.utcnow().isoformat()
        }).eq("user_id", user_id).eq("pdf_id", pdf_id).execute()
        return response
    else:
        data = {
            "user_id": user_id,
            "pdf_id": pdf_id,
            "title": title,
            "file_url": file_url,
            "last_page": last_page
        }
        response = supabase.table("reading_history").insert(data).execute()
        return response

def get_reading_history(user_id: str):
    response = supabase.table("reading_history").select("*").eq("user_id", user_id).order("last_accessed", desc=True).execute()
    return response

def delete_reading_history(history_id: str, user_id: str):
    response = supabase.table("reading_history").delete().eq("id", history_id).eq("user_id", user_id).execute()
    return response
