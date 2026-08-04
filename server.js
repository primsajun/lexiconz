import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Server is running');
});

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://rvaybtduugfsgnyawywa.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YXlidGR1dWdmc2dueWF3eXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTc2NzE2MSwiZXhwIjoyMTAxMzQzMTYxfQ.yDSwNS5f641XEaBWFcpcWyc0VAoBj0h83pd9WbqEwZE'
);

// Config
app.get('/api/config', (req, res) => {
    res.json({
        supabase_url: process.env.SUPABASE_URL || 'https://rvaybtduugfsgnyawywa.supabase.co',
        supabase_key: process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YXlidGR1dWdmc2dueWF3eXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjcxNjEsImV4cCI6MjEwMTM0MzE2MX0.5LMuzC0GLecR1YZqE4lnbwqmuVlUzM3_lpFYain1Ym0'
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

// Supabase Storage Upload via Backend (Bypasses RLS)
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const safeName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    // Upload buffer directly to Supabase
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

    res.json({ status: "success", url: publicUrl, filename: req.file.originalname, data });
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

    const { data, error } = await supabase
        .from('reading_history')
        .select('*')
        .eq('user_id', user_id)
        .order('last_accessed', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ data: data || [] });
});

// History POST
app.post('/api/history', upload.none(), async (req, res) => {
    const { user_id, pdf_id, title, file_url, last_page } = req.body;
    if (!user_id || !pdf_id || !file_url) return res.status(400).json({ error: "Missing parameters" });

    const { data: existing } = await supabase
        .from('reading_history')
        .select('id')
        .eq('user_id', user_id)
        .eq('pdf_id', pdf_id)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('reading_history')
            .update({ last_page: parseInt(last_page, 10) || 1, last_accessed: new Date().toISOString() })
            .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
    } else {
        const { error } = await supabase
            .from('reading_history')
            .insert([{
                user_id,
                pdf_id,
                title: title || pdf_id,
                file_url,
                last_page: parseInt(last_page, 10) || 1,
                last_accessed: new Date().toISOString()
            }]);
        if (error) return res.status(500).json({ error: error.message });
    }

    res.json({ status: "success", source: 'supabase' });
});

// History DELETE
app.delete('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!id || !user_id) return res.status(400).json({ error: "Missing parameters" });

    const { error } = await supabase
        .from('reading_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });
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

// Start Server (only if not running in serverless environment)
if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    app.listen(port, () => {
        console.log(`🚀 Server is running at http://localhost:${port}`);
    });
}

export default app;
