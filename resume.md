# Lexiconz - Interactive PDF Reader & Smart Vocabulary Assistant

## 📝 Project Description
Developed a full-stack, responsive web application designed for language learners and avid readers. Lexiconz transforms static PDFs into interactive learning environments, allowing users to click any word to instantly view definitions, translations, and audio pronunciations without leaving the page. Built with a serverless architecture, it features secure user authentication and a cloud-synced database to track reading progress and save personalized vocabulary lists.

## ✨ Key Features
* **Interactive Text Engine:** Engineered a custom PDF rendering overlay using PDF.js that maps invisible, selectable HTML elements over canvas text, enabling instantaneous word selection on both desktop and mobile touch devices.
* **Smart Dictionary & Translation:** Integrated robust third-party APIs to deliver real-time dictionary definitions, multi-language translations, and text-to-speech audio playback directly inside a responsive, native-feeling mobile "bottom sheet" UI.
* **Cloud-Synced Progress Tracking:** Implemented persistent reading history that automatically remembers the user's exact page number across devices.
* **Personalized Vocabulary Library:** Built a secure authentication flow that allows users to seamlessly save, manage, and review unknown words they encounter while reading.
* **Serverless Architecture:** Deployed the backend using Node.js/Express on Netlify Serverless Functions, ensuring high performance, zero-maintenance scaling, and secure API key management.

## 🛠 Technology Stack & Purpose
* **Vanilla JavaScript, HTML, & CSS:** Used to build the frontend. Chosen over heavy frameworks like React to keep the reading experience extremely fast and lightweight, especially for older mobile devices.
* **PDF.js (by Mozilla):** Used as the core reading engine. It renders PDF pages as images (Canvas) and creates an invisible layer of text (`textLayer`) perfectly positioned over the image, allowing users to click and select text as if it were a normal webpage.
* **Node.js & Express.js:** Used as the backend "middleman." It creates custom API endpoints (e.g., `/api/history`) to securely process data sent from the frontend.
* **Netlify Serverless Functions:** Used to host the Express backend. Instead of paying for a server that runs 24/7, Netlify wakes up the code instantly only when a user makes a request, making it highly scalable and cost-effective.
* **Supabase (PostgreSQL & Auth):** Used as the cloud database and authentication provider. It securely manages user sign-ups and stores persistent data like reading history and saved vocabulary lists, ensuring users can only access their own private data.
* **Free Dictionary API & Google Translate TTS:** Used to fetch real-time definitions, phonetic spellings, and audio pronunciations when a user clicks a word.

## 🚧 Challenges Faced & Solutions

### 1. Mobile Text Selection Conflicts
* **Problem:** On mobile devices, native OS text-selection magnifiers and menus often clashed with custom floating popup dictionaries, leading to a frustrating user experience where the popup would hide behind the native keyboard or selection tools.
* **Solution:** Engineered a mobile-first UI approach by replacing the floating draggable window with a native-feeling "Bottom Sheet." Tied into the `touchend` and `selectionchange` events, the dictionary gracefully slides up from the bottom of the screen, completely avoiding native mobile UI conflicts.

### 2. Google Translate Audio `403 Forbidden` Blocks
* **Problem:** Fetching text-to-speech audio directly from Google Translate's unofficial API returned `403 Forbidden` errors because Google blocks requests containing strict referrer headers originating from external websites.
* **Solution:** Modified the frontend architecture by implementing the `<meta name="referrer" content="no-referrer">` tag. This natively stripped the referrer headers from the browser's audio requests, successfully bypassing the block without needing to route heavy audio files through the backend.

### 3. Database Hibernation on Free Tiers
* **Problem:** The Supabase free-tier PostgreSQL database automatically pauses after 7 days of inactivity, which would cause the app to crash for users attempting to log in after a week of zero traffic.
* **Solution:** Engineered a lightweight, database-touching `/api/ping` endpoint on the Express backend. Integrated this endpoint with `cron-job.org` to automatically wake up the serverless backend and ping the database every 2 days, guaranteeing 100% database uptime.
