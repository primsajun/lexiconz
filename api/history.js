import { supabase } from './utils/db.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const { user_id } = req.query;
        if (!user_id) return res.status(400).json({ error: "Missing user_id" });
        
        const { data, error } = await supabase
            .from('reading_history')
            .select('*')
            .eq('user_id', user_id)
            .order('last_accessed', { ascending: false });
            
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({ data: data || [] });
    } 
    else if (req.method === 'POST') {
        const { user_id, pdf_id, title, file_url, last_page } = req.body;
        if (!user_id || !pdf_id) return res.status(400).json({ error: "Missing parameters" });
        
        const { data: existing } = await supabase
            .from('reading_history')
            .select('*')
            .eq('user_id', user_id)
            .eq('pdf_id', pdf_id)
            .single();
            
        let result;
        if (existing) {
            result = await supabase
                .from('reading_history')
                .update({ last_page: parseInt(last_page), last_accessed: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            result = await supabase
                .from('reading_history')
                .insert([{ user_id, pdf_id, title, file_url, last_page: parseInt(last_page) }]);
        }
        
        if (result.error) return res.status(400).json({ error: result.error.message });
        return res.status(200).json({ status: "success" });
    }
    
    res.status(405).json({ error: "Method not allowed" });
}
