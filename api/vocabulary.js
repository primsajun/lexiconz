import { supabase } from './utils/db.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: "Missing user_id" });
        
        const { data, error } = await supabase
            .from('saved_words')
            .select('*')
            .eq('user_id', user_id)
            .order('saved_at', { ascending: false });
            
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data: data || [] });
    } 
    else if (req.method === 'POST') {
        const { user_id, pdf_id, word, meaning, translation, language, page } = req.body;
        if (!user_id || !word) return res.status(400).json({ error: "Missing parameters" });
        
        const { error } = await supabase
            .from('saved_words')
            .insert([{ 
                user_id, 
                pdf_id: pdf_id || null, 
                word, 
                meaning, 
                translation, 
                language, 
                page: parseInt(page) || 1 
            }]);
            
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ status: "success" });
    }
    
    res.status(405).json({ error: "Method not allowed" });
}
