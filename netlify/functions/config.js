export default async (req, context) => {
    return new Response(JSON.stringify({
        supabase_url: process.env.SUPABASE_URL,
        supabase_key: process.env.SUPABASE_KEY
    }), {
        headers: { "Content-Type": "application/json" }
    });
};

export const config = {
    path: "/api/config"
};
