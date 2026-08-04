import requests
from .ai import get_fallback_definition

def get_word_definition(word: str):
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=en&dt=md&dt=rm&q={word}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            
            # Extract phonetic
            phonetic = ""
            if len(data) > 0 and data[0] and len(data[0]) > 0 and len(data[0][0]) > 3:
                phonetic = data[0][0][3] or ""
            if phonetic:
                phonetic = f"/{phonetic}/"
                
            # Extract meaning
            meaning = ""
            for item in data:
                if isinstance(item, list) and len(item) > 0 and isinstance(item[0], list) and len(item[0]) > 1:
                    try:
                        if isinstance(item[0][1], list) and isinstance(item[0][1][0], list):
                            meaning = item[0][1][0][0]
                            break
                    except:
                        continue
            
            if meaning:
                return {
                    "word": word,
                    "phonetic": phonetic,
                    "audio": f"/api/tts/{word}",
                    "meaning": meaning,
                    "example": "",
                    "synonyms": []
                }
        return get_fallback_definition(word)
    except Exception as e:
        print("Google Translate Dictionary Error:", e)
        return get_fallback_definition(word)
