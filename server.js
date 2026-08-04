import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });
const historyStorePath = path.join(__dirname, 'data', 'history.json');
if (!fs.existsSync(path.dirname(historyStorePath))) {
    fs.mkdirSync(path.dirname(historyStorePath), { recursive: true });
}

function readHistoryStore() {
    try {
        if (!fs.existsSync(historyStorePath)) return [];
        const raw = fs.readFileSync(historyStorePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function writeHistoryStore(items) {
    fs.writeFileSync(historyStorePath, JSON.stringify(items, null, 2));
}

function upsertHistoryStore(userId, record) {
    const items = readHistoryStore();
    const existingIndex = items.findIndex(item => item.user_id === userId && item.pdf_id === record.pdf_id);
    if (existingIndex >= 0) {
        items[existingIndex] = { ...items[existingIndex], ...record, last_accessed: new Date().toISOString() };
    } else {
        items.unshift({ ...record, user_id: userId, last_accessed: new Date().toISOString() });
    }
    writeHistoryStore(items);
    return items;
}

function deleteHistoryStore(userId, id) {
    const items = readHistoryStore().filter(item => !(item.user_id === userId && item.id === id));
    writeHistoryStore(items);
    return items;
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);
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
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=en&dt=md&q=${encodeURIComponent(word)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        let meaning = "No definition found.";
        if (data && data[12] && data[12][0] && data[12][0][1] && data[12][0][1][0]) {
            meaning = data[12][0][1][0][0];
        }
        
        res.json({
            word: word,
            meaning: meaning,
            audio: null
        });
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

// Supabase Storage Upload
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const safeName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(safeName, req.file.buffer, {
            contentType: req.file.mimetype || 'application/pdf',
            upsert: false
        });

    if (uploadError) {
        return res.status(500).json({ error: uploadError.message });
    }

    const { data: publicData } = supabase.storage.from('pdfs').getPublicUrl(safeName);
    const publicUrl = publicData.publicUrl;

    const { data, error } = await supabase.from('pdfs').insert([{ title: req.file.originalname, file_url: publicUrl }]);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ status: "success", url: publicUrl, filename: req.file.originalname, data, storagePath: uploadData?.path });
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
    const { user_id, title, file_url, last_page } = req.body;
    if (!user_id || !file_url) return res.status(400).json({ error: "Missing parameters" });
    
    const { data: existing } = await supabase.from('reading_history').select('*').eq('user_id', user_id).eq('file_url', file_url).single();
    let result;
    if (existing) {
        result = await supabase.from('reading_history').update({ last_page: parseInt(last_page) || 1, last_accessed: new Date().toISOString() }).eq('id', existing.id);
    } else {
        result = await supabase.from('reading_history').insert([{ user_id, title, file_url, last_page: parseInt(last_page) || 1 }]);
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
    
    const { data, error } = await supabase.from('saved_words').select('*').eq('user_id', user_id).order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: data || [] });
});

// Vocabulary POST
app.post('/api/vocabulary', upload.none(), async (req, res) => {
    const { user_id, word, meaning, translation, language, page } = req.body;
    if (!user_id || !word) return res.status(400).json({ error: "Missing parameters" });
    
    const { error } = await supabase.from('saved_words').insert([{ user_id, pdf_id: null, word, meaning, translation, language, page: parseInt(page) || 1 }]);
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

// Start Server (only if not running in a serverless environment like Netlify)
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    app.listen(port, () => {
        console.log(`\n🚀 Server is running at http://localhost:${port}\n`);
    });
}

export default app;
