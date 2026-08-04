export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const word = req.body.word;
    const targetLanguage = req.body.target_language;
    
    if (!word || !targetLanguage) return res.status(400).json({ error: "Missing parameters" });

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
        res.status(200).json({ translation: translatedText, lang_code: langCode });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
