export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    const formData = await req.formData();
    const word = formData.get('word');
    const targetLanguage = formData.get('target_language');
    
    if (!word || !targetLanguage) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const langMap = {
        "Tamil": "ta",
        "Hindi": "hi",
        "French": "fr",
        "Spanish": "es"
    };
    const langCode = langMap[targetLanguage] || "es";
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${langCode}&dt=t&q=${encodeURIComponent(word)}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        const translatedText = data[0][0][0];
        
        return new Response(JSON.stringify({ translation: translatedText, lang_code: langCode }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

export const config = {
    path: "/api/translate"
};
