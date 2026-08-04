import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    const formData = await req.formData();
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!email || !password) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }

    return new Response(JSON.stringify({
        status: "success",
        access_token: data.session.access_token,
        user_id: data.user.id,
        name: data.user.user_metadata?.name || "User"
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};

export const config = {
    path: "/api/auth/login"
};
