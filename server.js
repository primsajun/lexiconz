import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Config
app.get('/api/config', (req, res) => {
    res.json({
        supabase_url: process.env.SUPABASE_URL,
        supabase_key: process.env.SUPABASE_KEY
    });
});

// Dictionary
app.get('/api/dictionary/:word', async (req, res) => {
    const { word } = req.params;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Define the word "${word}". Return a JSON object with EXACTLY this structure, nothing else (no markdown, no quotes): {"word": "${word}", "meaning": "A clear, concise definition of the word.", "audio": null}`;
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        res.json(JSON.parse(text));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Translate
app.post('/api/translate', upload.none(), async (req, res) => {
    const word = req.body.word;
    const targetLanguage = req.body.target_language;
    if (!word || !targetLanguage) return res.status(400).json({ error: "Missing parameters" });

    const langMap = { "Tamil": "ta", "Hindi": "hi", "French": "fr", "Spanish": "es" };
    const langCode = langMap[targetLanguage] || "es";
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${langCode}&dt=t&q=${encodeURIComponent(word)}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json({ translation: data[0][0][0], lang_code: langCode });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// TTS
app.get('/api/tts/:word', async (req, res) => {
    const word = req.params.word;
    const lang = req.query.lang || "en";
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(word)}`;
    
    try {
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!response.ok) throw new Error("TTS failed");
        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(buffer));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save PDF
app.post('/api/save_pdf', upload.none(), async (req, res) => {
    const { filename, public_url } = req.body;
    if (!filename || !public_url) return res.status(400).json({ error: "Missing parameters" });
    
    const { data, error } = await supabase.from('pdfs').insert([{ title: filename, file_url: public_url }]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: "success", data });
});

// Auth Register
app.post('/api/auth/register', upload.none(), async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing parameters" });
    
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: "success", data });
});

// Auth Login
app.post('/api/auth/login', upload.none(), async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing parameters" });
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ status: "success", access_token: data.session.access_token, user_id: data.user.id, name: data.user.user_metadata?.name || "User" });
});

// History GET
app.get('/api/history', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });
    
    const { data, error } = await supabase.from('reading_history').select('*').eq('user_id', user_id).order('last_accessed', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
});

// History POST
app.post('/api/history', upload.none(), async (req, res) => {
    const { user_id, pdf_id, title, file_url, last_page } = req.body;
    if (!user_id || !pdf_id) return res.status(400).json({ error: "Missing parameters" });
    
    const { data: existing } = await supabase.from('reading_history').select('*').eq('user_id', user_id).eq('pdf_id', pdf_id).single();
    let result;
    if (existing) {
        result = await supabase.from('reading_history').update({ last_page: parseInt(last_page), last_accessed: new Date().toISOString() }).eq('id', existing.id);
    } else {
        result = await supabase.from('reading_history').insert([{ user_id, pdf_id, title, file_url, last_page: parseInt(last_page) }]);
    }
    if (result.error) return res.status(400).json({ error: result.error.message });
    res.json({ status: "success" });
});

// History DELETE
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!id || !user_id) return res.status(400).json({ error: "Missing parameters" });
    
    const { error } = await supabase.from('reading_history').delete().eq('id', id).eq('user_id', user_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: "success" });
});

// Vocabulary GET
app.get('/api/vocabulary', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "Missing user_id" });
    
    const { data, error } = await supabase.from('saved_words').select('*').eq('user_id', user_id).order('saved_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
});

// Vocabulary POST
app.post('/api/vocabulary', upload.none(), async (req, res) => {
    const { user_id, pdf_id, word, meaning, translation, language, page } = req.body;
    if (!user_id || !word) return res.status(400).json({ error: "Missing parameters" });
    
    const { error } = await supabase.from('saved_words').insert([{ user_id, pdf_id: pdf_id || null, word, meaning, translation, language, page: parseInt(page) || 1 }]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: "success" });
});

// Vocabulary DELETE
app.delete('/api/vocabulary/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!id || !user_id) return res.status(400).json({ error: "Missing parameters" });
    
    const { error } = await supabase.from('saved_words').delete().eq('id', id).eq('user_id', user_id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ status: "success" });
});

// Start Server
app.listen(port, () => {
    console.log(`\n🚀 Server is running at http://localhost:${port}\n`);
});
