import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    const formData = await req.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (!name || !email || !password) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name }
        }
    });

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ status: "success", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};

export const config = {
    path: "/api/auth/register"
};
