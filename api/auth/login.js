import { supabase } from '../utils/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const { email, password } = req.body;
    
    if (!email || !password) return res.status(400).json({ error: "Missing parameters" });

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    res.status(200).json({
        status: "success",
        access_token: data.session.access_token,
        user_id: data.user.id,
        name: data.user.user_metadata?.name || "User"
    });
}
