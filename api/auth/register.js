import { supabase } from '../utils/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) return res.status(400).json({ error: "Missing parameters" });

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name }
        }
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ status: "success", data });
}
