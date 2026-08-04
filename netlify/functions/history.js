import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method === 'GET') {
        const urlObj = new URL(req.url);
        const user_id = urlObj.searchParams.get('user_id');
        
        if (!user_id) {
            return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
        }
        
        const { data, error } = await supabase
            .from('reading_history')
            .select('*')
            .eq('user_id', user_id)
            .order('last_accessed', { ascending: false });
            
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }
        
        return new Response(JSON.stringify({ data: data || [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } 
    else if (req.method === 'POST') {
        const formData = await req.formData();
        const user_id = formData.get('user_id');
        const pdf_id = formData.get('pdf_id');
        const title = formData.get('title');
        const file_url = formData.get('file_url');
        const last_page = formData.get('last_page');
        
        if (!user_id || !pdf_id) {
            return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
        }
        
        const { data: existing } = await supabase
            .from('reading_history')
            .select('*')
            .eq('user_id', user_id)
            .eq('pdf_id', pdf_id)
            .single();
            
        let result;
        if (existing) {
            result = await supabase
                .from('reading_history')
                .update({ last_page: parseInt(last_page), last_accessed: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            result = await supabase
                .from('reading_history')
                .insert([{ user_id, pdf_id, title, file_url, last_page: parseInt(last_page) }]);
        }
        
        if (result.error) {
            return new Response(JSON.stringify({ error: result.error.message }), { status: 400 });
        }
        
        return new Response(JSON.stringify({ status: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config = {
    path: "/api/history"
};
