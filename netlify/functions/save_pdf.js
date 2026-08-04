import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    const formData = await req.formData();
    const filename = formData.get('filename');
    const public_url = formData.get('public_url');
    
    if (!filename || !public_url) {
        return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const { data, error } = await supabase
        .from('pdfs')
        .insert([{ title: filename, file_url: public_url }]);

    if (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: "success", data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
};

export const config = {
    path: "/api/save_pdf"
};
