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

-- Create the reading history table used by the app
CREATE TABLE IF NOT EXISTS reading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    pdf_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    last_page INTEGER DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the Search History table
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: if you want the history list to be queryable by user quickly
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_pdf_id ON reading_history(pdf_id);

-- (Optional) If you haven't created the storage bucket yet, you can run this:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', true);
