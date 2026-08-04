import { supabase } from '../utils/db.js';

export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: "Method not allowed" });
    
    const { id } = req.query;
    const { user_id } = req.query;
    
    if (!id || !user_id) return res.status(400).json({ error: "Missing parameters" });

    const { error } = await supabase
        .from('saved_words')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ status: "success" });
}
