import { GoogleGenerativeAI } from "@google/generative-ai";

export default async (req, context) => {
    const word = context.params.word;
    
    if (!word) {
        return new Response(JSON.stringify({ error: "Word is required" }), { status: 400 });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Define the word "${word}". Return a JSON object with EXACTLY this structure, nothing else (no markdown, no quotes): {"word": "${word}", "meaning": "A clear, concise definition of the word.", "audio": null}`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return new Response(text, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

export const config = {
    path: "/api/dictionary/:word"
};
