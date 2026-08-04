import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // This should ideally be the service_role key for admin actions, but anon key works if RLS allows it

export const supabase = createClient(supabaseUrl, supabaseKey);
