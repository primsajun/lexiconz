import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method !== 'DELETE') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    const id = context.params.id;
    const urlObj = new URL(req.url);
    const user_id = urlObj.searchParams.get('user_id');
    
    if (!id || !user_id) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const { error } = await supabase
        .from('saved_words')
        .delete()
        .eq('id', id)
        .eq('user_id', user_id);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    
    return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};

export const config = {
    path: "/api/vocabulary/:id"
};
