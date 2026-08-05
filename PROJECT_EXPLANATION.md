# Lexiconz - Project Explanation & Interview Guide

This document is designed to help you explain the **Lexiconz** project in an interview setting. It breaks down the purpose, the technology stack, the architecture, and the specific challenges solved during development.

---

## 1. Project Overview

### **Q: Can you tell me about the project you built?**
**A:** I built **Lexiconz**, an intelligent PDF reading web application designed for language learners and avid readers. 
The core problem it solves is the friction of encountering unknown words while reading. Instead of switching tabs to Google a word or use a separate dictionary app, Lexiconz allows users to simply click or highlight any word directly inside the PDF. It instantly pops up the definition, phonetic pronunciation, and audio playback. Users can also translate the word into multiple languages and save it to their personal "Vocabulary Library" for later review. It also tracks reading history so you can pick up exactly where you left off.

---

## 2. Technology Stack

### **Q: What technology stack did you use and why?**
**A:** I built Lexiconz using a modern, lightweight, and highly performant stack:

#### **Frontend (Client-Side)**
*   **Vanilla HTML, CSS, JavaScript**: I specifically chose not to use heavy frameworks like React or Angular because the core requirement was raw performance for rendering large PDFs and handling fast text-selection events.
*   **PDF.js (by Mozilla)**: Used as the core engine to parse PDF files and render them onto an HTML5 Canvas, while generating a hidden, selectable text layer on top.
*   **PWA (Progressive Web App)**: Configured with a `manifest.json` and a Service Worker (`sw.js`) so the app can be installed natively on desktop and mobile devices.
*   **UI/UX**: Custom CSS featuring modern Glassmorphism (frosted glass) effects and a bespoke "Classic Library" aesthetic.

#### **Backend (Server-Side)**
*   **Python & FastAPI**: Chosen for its incredibly fast, asynchronous request handling. FastAPI makes building RESTful APIs extremely simple and automatically generates API documentation.
*   **SQLite database**: A lightweight, file-based SQL database used to store user accounts, saved vocabulary, and reading history. 
*   **External APIs**: 
    *   *Free Dictionary API* for real-time word definitions, parts of speech, and phonetic audio.
    *   *Google Translate (via proxy/library)* for instant translations into languages like Tamil, Hindi, French, and Spanish.
    *   *Google TTS* for Text-to-Speech audio of translated words.

---

## 3. Deep Dive into Features & Architecture

### **Q: How did you implement the PDF rendering and text selection?**
**A:** This was one of the most complex parts of the app. Standard HTML cannot easily render a PDF natively with selectable text. 
1. I used **PDF.js** to fetch the PDF file and render each page visually onto an `<canvas>` element. 
2. However, you can't highlight text on a canvas. So, I used PDF.js's `getTextContent()` method to extract the raw text and coordinates, and then dynamically injected invisible `<div>` elements perfectly layered on top of the canvas. 
3. I then attached mouse event listeners (`mouseup`) to this text layer. When a user highlights a word, the browser's `window.getSelection()` API grabs the string, validates it as a single word, and triggers the Dictionary API to show the contextual popup.

### **Q: How does the app handle page tracking and state management?**
**A:** I wanted the app to feel seamless even if the user refreshed the page. 
*   **Local Storage**: I use the browser's `localStorage` to cache the current Page Number. When the user flips a page, it instantly updates. If they accidentally refresh the browser, the initialization script reads this number and jumps right back to where they were.
*   **URL Management**: To prevent navigation bugs, when a user opens a PDF, the app dynamically scrubs navigation parameters from the URL (`history.replaceState()`) so the browser doesn't falsely redirect them upon refresh.
*   **Backend Sync**: For logged-in users, the frontend debounces a sync request (using `setTimeout`) every time they turn a page, quietly saving their exact position to the SQLite database in the background.

### **Q: How does the Progressive Web App (PWA) functionality work?**
**A:** I designed Lexiconz to be installable like a native app. 
I created custom app icons (`192x192` and `512x512`), linked them in a `manifest.json` file, and injected metadata into the HTML heads. I also implemented a **Service Worker** (`sw.js`) that runs in the background. Because of these configurations, mobile browsers (like Chrome and Safari) and desktop browsers will prompt the user to "Add to Home Screen" or "Install App".

---

## 4. Challenges & Solutions

### **Q: What was the hardest technical challenge you faced, and how did you solve it?**
**A:** 
**1. The "Disappearing PDF" on Refresh:**
Initially, when a user uploaded a local PDF from their computer, I created a temporary `blob:` URL to display it. However, if the user refreshed the page, the browser destroyed the Blob out of memory, causing the PDF to crash and disappear. 
*Solution:* I updated the architecture to actually upload the file to the backend via a `fetch` request, which returns a permanent server URL. The frontend then caches this stable URL in `localStorage`. Now, even if you close the browser and come back tomorrow, your PDF is still there.

**2. High-DPI (Retina) Blurriness:**
When rendering PDFs to the canvas, the text looked blurry on modern MacBooks and mobile phones because of high pixel density screens.
*Solution:* I implemented a scaling fix by calculating `window.devicePixelRatio`. I dynamically multiplied the canvas width and height by this ratio, and then scaled it back down using CSS. This forces the browser to render the PDF at 2x or 3x resolution, making the text incredibly crisp.
