import { supabase } from './utils/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const { filename, public_url } = req.body;
    
    if (!filename || !public_url) return res.status(400).json({ error: "Missing parameters" });

    const { data, error } = await supabase
        .from('pdfs')
        .insert([{ title: filename, file_url: public_url }]);

    if (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ status: "success", data });
}
