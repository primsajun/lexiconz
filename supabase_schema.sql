-- Create the PDFs table
CREATE TABLE pdfs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the Saved Words table
CREATE TABLE saved_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT, -- Currently storing a mock string, change to UUID if using Supabase Auth
    pdf_id TEXT,
    word TEXT NOT NULL,
    meaning TEXT,
    language TEXT,
    page INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the Search History table
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- (Optional) If you haven't created the storage bucket yet, you can run this:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', true);
