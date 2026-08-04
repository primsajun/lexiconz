export default async (req, context) => {
    const word = context.params.word;
    const urlObj = new URL(req.url);
    const lang = urlObj.searchParams.get('lang') || "en";
    
    if (!word) {
        return new Response(JSON.stringify({ error: "Word is required" }), { status: 400 });
    }

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
        
        return new Response(arrayBuffer, {
            status: 200,
            headers: { "Content-Type": "audio/mpeg" }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

export const config = {
    path: "/api/tts/:word"
};
