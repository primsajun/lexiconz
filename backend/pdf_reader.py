import os
from .database import supabase

def upload_pdf_to_storage(file_obj, filename: str):
    try:
        # Assumes a bucket named "pdfs" exists in Supabase
        if hasattr(file_obj, "seek"):
            file_obj.seek(0)
        
        # Read into bytes because httpx (used by supabase-py) can struggle with SpooledTemporaryFile streaming
        file_bytes = file_obj.read()
        
        # Use upsert=true so uploading the same PDF twice doesn't throw an error
        res = supabase.storage.from_('pdfs').upload(
            filename, 
            file_bytes, 
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
            
        # Get public URL
        public_url = supabase.storage.from_('pdfs').get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"Error uploading to storage: {e}")
        return None
