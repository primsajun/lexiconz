export default function handler(req, res) {
    res.status(200).json({
        supabase_url: process.env.SUPABASE_URL,
        supabase_key: process.env.SUPABASE_KEY
    });
}
