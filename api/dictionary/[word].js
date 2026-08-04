import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    const { word } = req.query;
    if (!word) return res.status(400).json({ error: "Word is required" });

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Define the word "${word}". Return a JSON object with EXACTLY this structure, nothing else (no markdown, no quotes): {"word": "${word}", "meaning": "A clear, concise definition of the word.", "audio": null}`;
        
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const data = JSON.parse(text);
        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
}
