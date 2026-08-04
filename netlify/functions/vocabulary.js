import { supabase } from './utils/db.js';

export default async (req, context) => {
    if (req.method === 'GET') {
        const urlObj = new URL(req.url);
        const user_id = urlObj.searchParams.get('user_id');
        
        if (!user_id) {
            return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
        }
        
        const { data, error } = await supabase
            .from('saved_words')
            .select('*')
            .eq('user_id', user_id)
            .order('saved_at', { ascending: false });
            
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
        const word = formData.get('word');
        const meaning = formData.get('meaning');
        const translation = formData.get('translation');
        const language = formData.get('language');
        const page = formData.get('page');
        
        if (!user_id || !word) {
            return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
        }
        
        const { error } = await supabase
            .from('saved_words')
            .insert([{ 
                user_id, 
                pdf_id: pdf_id || null, 
                word, 
                meaning, 
                translation, 
                language, 
                page: parseInt(page) || 1 
            }]);
            
        if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }
        
        return new Response(JSON.stringify({ status: "success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
};

export const config = {
    path: "/api/vocabulary"
};
