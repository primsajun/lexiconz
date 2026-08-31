# Lexiconz 📖

## 📌 Overview
**Lexiconz** is an intelligent, interactive PDF reading companion designed for language learners and avid readers. It transforms static PDFs into a dynamic learning environment where you can click any word to instantly view its definition, translation, and audio pronunciation without ever leaving the page or opening a new tab.

## 🛠 Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **PDF Engine:** PDF.js (Mozilla)
* **Backend:** Node.js, Express.js, Netlify Serverless Functions
* **Database & Auth:** Supabase (PostgreSQL)
* **APIs:** Free Dictionary API, Google Translate TTS (Text-to-Speech)

## ✨ Features
* 🖱️ **Interactive Text Selection:** Click any word in a PDF to instantly look it up.
* 📚 **Smart Dictionary & Translation:** Get definitions, parts of speech, and multi-language translations in real-time.
* 🔊 **Audio Pronunciation:** Hear exactly how words are spoken via integrated text-to-speech.
* 📱 **Mobile-First UI:** A sleek, native-feeling "Bottom Sheet" dictionary that avoids native OS text-selection conflicts.
* ☁️ **Cloud-Synced Progress:** Automatically remembers the exact page you were reading across all your devices.
* 💾 **Personalized Vocabulary:** Securely save unknown words to your private library for later review.

## 🏗 Architecture
Lexiconz is built on a highly performant **Serverless Architecture**. The frontend is lightweight vanilla JavaScript, while the backend API routes run on **Netlify Serverless Functions**. This means the backend spins up instantly on demand, keeping costs low and performance high. Persistent data and user authentication are securely managed by **Supabase**.


## 🚀 Live Demo
Experience the app live here: **[https://lexiconz.netlify.app](https://lexiconz.netlify.app)**

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/primsajun/lexiconz.git
   ```
2. Navigate to the project directory:
   ```bash
   cd lexiconz
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the local server:
   ```bash
   node server.js
   ```
   *(Or start using the Netlify CLI if you have it installed: `netlify dev`)*

## 🔐 Environment Variables
To run this project locally, you will need to set up a Supabase project and provide the following environment variables in your backend or Netlify dashboard:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
```
