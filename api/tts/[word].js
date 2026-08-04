export default async function handler(req, res) {
    const { word, lang = "en" } = req.query;
    if (!word) return res.status(400).json({ error: "Word is required" });

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(word)}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });
        
        if (!response.ok) {
            throw new Error(`Google TTS failed with status: ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
