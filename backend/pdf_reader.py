import fitz # PyMuPDF
import os
from .database import supabase

def extract_text_from_pdf(filepath: str):
    text = ""
    try:
        doc = fitz.open(filepath)
        for page in doc:
            text += page.get_text()
    except Exception as e:
        print(f"Error extracting text: {e}")
    return text

def upload_pdf_to_storage(filepath: str, filename: str):
    try:
        # Assumes a bucket named "pdfs" exists in Supabase
        with open(filepath, 'rb') as f:
            res = supabase.storage.from_('pdfs').upload(filename, f)
            
        # Get public URL
        public_url = supabase.storage.from_('pdfs').get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"Error uploading to storage: {e}")
        return None
