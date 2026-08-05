const API_BASE = window.__Lexicona_API_BASE__ || "/api";
let currentPdfId = "";
let currentPdfText = ""; // For basic context to AI

function resolveApiUrl(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE.replace(/\/$/, "")}${normalizedPath}`;
}

function resolvePdfUrl(url) {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) {
        if (API_BASE.startsWith("http")) {
            try {
                const base = new URL(API_BASE);
                return `${base.origin}${url}`;
            } catch (err) {
                return url;
            }
        }

        if (window.location.origin && window.location.origin !== "null") {
            return `${window.location.origin}${url}`;
        }

        return url;
    }

    return url;
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('ServiceWorker registration failed: ', err));
    });
}

// --- Reader Logic (reader.html) ---
const pdfViewer = document.getElementById('pdfViewer');
if (pdfViewer) {
    let pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = window.innerWidth <= 768 ? 0.75 : 1.0, // 75% on mobile, 100% on desktop
        canvas = document.getElementById('pdfRenderCanvas'),
        ctx = canvas.getContext('2d'),
        textLayerDiv = document.getElementById('textLayer');

    const urlParams = new URLSearchParams(window.location.search);
    let pdfUrl = urlParams.get('pdfUrl');
    currentPdfId = urlParams.get('pdfId');
    const initialPage = urlParams.get('page');
    const forceHome = urlParams.get('home');

    if (!pdfUrl && !forceHome) {
        pdfUrl = localStorage.getItem('lastPdfUrl');
        currentPdfId = localStorage.getItem('lastPdfId') || "unknown";
    } else if (forceHome && !localStorage.getItem('user_id')) {
        // Clear history if forcing home while not logged in
        localStorage.removeItem('lastPdfUrl');
        localStorage.removeItem('lastPdfId');
    } else {
        currentPdfId = currentPdfId || "unknown";
    }

    function loadPDF(url, id) {
        // Remove ?home=true from URL so refresh doesn't force the home page
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('home')) {
            currentUrl.searchParams.delete('home');
            window.history.replaceState({}, document.title, currentUrl.pathname + currentUrl.search);
        }

        document.getElementById('pdfLoadingOverlay').classList.remove('hidden');
        currentPdfId = id || "unknown";
        localStorage.setItem('lastPdfUrl', url);
        localStorage.setItem('lastPdfId', currentPdfId);
        
        const fetchUrl = resolvePdfUrl(url);
        
        pdfjsLib.getDocument(fetchUrl).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            const storedPage = localStorage.getItem('lastPageNum');
            pageNum = initialPage ? parseInt(initialPage) : (storedPage ? parseInt(storedPage) : 1);
            if (pageNum > pdfDoc.numPages) pageNum = pdfDoc.numPages;
            document.getElementById('pageCount').textContent = pdfDoc.numPages;
            renderPage(pageNum);
        }).catch(err => {
            console.error(err);
            alert("Error loading PDF");
        });
    }

    const landingView = document.getElementById('landingView');
    const readerView = document.getElementById('readerView');
    const forceMain = urlParams.get('main') === 'true';

    if (pdfUrl || forceMain) {
        if (landingView) landingView.classList.add('hidden');
        if (readerView) readerView.style.display = 'flex';
        if (pdfUrl) loadPDF(pdfUrl, currentPdfId);
    } else {
        if (landingView) landingView.classList.remove('hidden');
        if (readerView) readerView.style.display = 'none';
        // Fallback for canvas if it somehow shows
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Upload a PDF to start reading...", 50, 100);
    }

    async function uploadPdfDirectly(file) {
        const formData = new FormData();
        formData.append("pdf", file);
        
        const uploadRes = await fetch(resolveApiUrl("/upload"), {
            method: "POST",
            body: formData
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            throw new Error(`Upload failed: ${err}`);
        }

        const data = await uploadRes.json();
        return { filename: data.filename, url: data.url };
    }

    // Landing Page Upload Logic
    const landingUploadBtn = document.getElementById('landingUploadBtn');
    const landingPdfInput = document.getElementById('landingPdfInput');
    
    if (landingUploadBtn && landingPdfInput) {
        landingUploadBtn.addEventListener('click', () => {
            landingPdfInput.click();
        });

        landingPdfInput.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            
            if (landingView) landingView.classList.add('hidden');
            if (readerView) readerView.style.display = 'flex';
            document.getElementById('pdfLoadingOverlay').classList.remove('hidden');
            
            try {
                const data = await uploadPdfDirectly(file);
                if (data.url) {
                    loadPDF(data.url, data.filename);
                }
            } catch (error) {
                console.error("Upload failed", error);
                alert("Upload failed: " + error.message);
                if (landingView) landingView.classList.remove('hidden');
                if (readerView) readerView.style.display = 'none';
            } finally {
                landingUploadBtn.textContent = "Select PDF File";
                landingUploadBtn.disabled = false;
            }
        });
    }

    // Nav Upload Logic
    const navUploadBtn = document.getElementById('navUploadBtn');
    const navPdfInput = document.getElementById('navPdfInput');
    
    if (navUploadBtn && navPdfInput) {
        navUploadBtn.addEventListener('click', () => {
            navPdfInput.click();
        });

        navPdfInput.addEventListener('change', async (e) => {
            if (e.target.files.length === 0) return;
            const file = e.target.files[0];
            document.getElementById('pdfLoadingOverlay').classList.remove('hidden');
            try {
                const data = await uploadPdfDirectly(file);
                if (data.url) {
                    loadPDF(data.url, data.filename);
                }
            } catch (error) {
                console.error("Upload failed", error);
                alert("Upload failed: " + error.message);
            } finally {
                navUploadBtn.textContent = "Upload PDF";
                navUploadBtn.disabled = false;
            }
        });
    }

    function renderPage(num) {
        pageRendering = true;
        localStorage.setItem('lastPageNum', num);
        
        // Sync history debounce
        if (typeof historySyncTimeout !== 'undefined') clearTimeout(historySyncTimeout);
        historySyncTimeout = setTimeout(() => {
            syncHistory(num);
        }, 1500);
        
        // Update Zoom Label
        const zoomLabel = document.getElementById('zoomLevel');
        if (zoomLabel) {
            zoomLabel.textContent = Math.round(scale * 100) + '%';
        }

        pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({scale: scale});
            
            // Fix blurriness on high-DPI screens
            const outputScale = window.devicePixelRatio || 1;
            canvas.width = Math.floor(viewport.width * outputScale);
            canvas.height = Math.floor(viewport.height * outputScale);
            canvas.style.width = Math.floor(viewport.width) + "px";
            canvas.style.height =  Math.floor(viewport.height) + "px";
            
            const transform = outputScale !== 1 
              ? [outputScale, 0, 0, outputScale, 0, 0] 
              : null;
            
            textLayerDiv.style.width = viewport.width + 'px';
            textLayerDiv.style.height = viewport.height + 'px';
            textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

            const renderContext = {
                canvasContext: ctx,
                transform: transform,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);

            renderTask.promise.then(function() {
                pageRendering = false;
                document.getElementById('pdfLoadingOverlay').classList.add('hidden');
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
                // Render text layer for selection
                return page.getTextContent();
            }).then(function(textContent) {
                textLayerDiv.innerHTML = ''; // clear
                // Extract simple text for AI context
                currentPdfText = textContent.items.map(s => s.str).join(' ');
                
                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: []
                });
            });
        });
        document.getElementById('pageNum').textContent = num;
    }

    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    document.getElementById('prevBtn').addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        scale += 0.25;
        queueRenderPage(pageNum);
    });
    
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        if(scale <= 0.5) return;
        scale -= 0.25;
        queueRenderPage(pageNum);
    });

    // --- Word Selection and Popup Logic ---
    const popup = document.getElementById('wordPopup');
    let currentWord = "";
    
    textLayerDiv.addEventListener('mouseup', handleTextSelection);
    textLayerDiv.addEventListener('touchend', handleTextSelection);
    
    function handleTextSelection(e) {
        setTimeout(() => { // slight delay ensures mobile selection is registered
            const selection = window.getSelection();
            const text = selection.toString().trim();
            
            if (text && text.split(/\s+/).length === 1 && /^[a-zA-Z]+$/.test(text)) {
                // It's a single word
                currentWord = text;
                
                let x = e.pageX;
                let y = e.pageY;
                
                if (e.type === 'touchend') {
                    // Mobile touch selection handle coordinates are unreliable.
                    // Always use bounding rect on touch to get accurate placement.
                    const rect = selection.getRangeAt(0).getBoundingClientRect();
                    x = rect.left + window.scrollX;
                    // Place it *below* the word to avoid overlapping the native iOS/Android "Copy" popup
                    y = rect.bottom + window.scrollY + 10;
                } else if (!x || !y) {
                    const rect = selection.getRangeAt(0).getBoundingClientRect();
                    x = rect.left + window.scrollX;
                    y = rect.top + window.scrollY;
                }
                
                showPopup(x, y, text);
            } else {
                popup.classList.add('hidden');
            }
        }, 150);
    }

    async function showPopup(x, y, word) {
        popup.style.left = `${x}px`;
        popup.style.top = `${y + 20}px`;
        popup.classList.remove('hidden');
        
        document.getElementById('popupWord').textContent = word;
        // Reset UI
        document.getElementById('popupMeaning').textContent = "Loading...";
        
        document.getElementById('translationResult').textContent = '';
        const playTransBtn = document.getElementById('playTranslatedAudioBtn');
        if(playTransBtn) playTransBtn.classList.add('hidden');
        
        // Fetch Dictionary Data
        try {
            const res = await fetch(resolveApiUrl(`/dictionary/${word}`));
            const data = await res.json();
            
            if (data.error) {
                document.getElementById('popupMeaning').textContent = "Definition not found.";
            } else {
                document.getElementById('popupMeaning').textContent = data.meaning || 'No definition found.';
                
                // Audio
                const playBtn = document.getElementById('playAudioBtn');
                playBtn.style.opacity = '1';
                playBtn.style.cursor = 'pointer';
                
                playBtn.onclick = () => {
                    // Use native browser Text-to-Speech to avoid all network blocks and CORS issues
                    window.speechSynthesis.cancel(); // Stop any currently playing audio
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = 'en-US';
                    window.speechSynthesis.speak(utterance);
                };
            }
        } catch(e) {
            console.error(e);
        }
    }

    // Popup Tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.remove('hidden');
        });
    });

    document.getElementById('closePopupBtn').addEventListener('click', () => {
        popup.classList.add('hidden');
    });

    // Make Popup Draggable (Mouse + Touch)
    const popupHeader = document.querySelector('.popup-header');
    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    popupHeader.style.cursor = 'move';

    function startDrag(e) {
        if(e.target.tagName === 'BUTTON') return;
        isDragging = true;
        
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        let clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        dragOffsetX = clientX - popup.getBoundingClientRect().left;
        dragOffsetY = clientY - popup.getBoundingClientRect().top;
        
        if (e.type === 'touchstart') e.preventDefault(); // Prevent scrolling while dragging header
    }

    function doDrag(e) {
        if (!isDragging) return;
        let clientX = e.clientX || (e.touches && e.touches[0].clientX);
        let clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        popup.style.left = `${clientX - dragOffsetX}px`;
        popup.style.top = `${clientY - dragOffsetY}px`;
    }

    function stopDrag() {
        isDragging = false;
    }

    popupHeader.addEventListener('mousedown', startDrag);
    popupHeader.addEventListener('touchstart', startDrag, {passive: false});

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('touchmove', doDrag, {passive: false});

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    // Translation
    document.getElementById('translateBtn').addEventListener('click', async () => {
        const lang = document.getElementById('targetLanguage').value;
        const formData = new URLSearchParams();
        formData.append('word', currentWord);
        formData.append('target_language', lang);
        
        try {
            const res = await fetch(resolveApiUrl("/translate"), {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.translation) {
                document.getElementById('translationResult').textContent = data.translation;
                
                // Show play button for translation
                const playTransBtn = document.getElementById('playTranslatedAudioBtn');
                playTransBtn.classList.remove('hidden');
                
                playTransBtn.onclick = () => {
                    // Use Google Translate TTS directly (meta no-referrer bypasses blocks)
                    window.speechSynthesis.cancel();
                    const audioUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=${data.lang_code}&q=${encodeURIComponent(data.translation)}`;
                    const audio = new Audio(audioUrl);
                    audio.play().catch(err => {
                        console.error("Translation audio play failed:", err);
                    });
                };
            } else {
                document.getElementById('translationResult').textContent = "Translation failed.";
                document.getElementById('playTranslatedAudioBtn').classList.add('hidden');
            }
        } catch(e) {
            console.error(e);
            document.getElementById('translationResult').textContent = "Error.";
        }
    });

    // Save Word
    document.getElementById('saveWordBtn').addEventListener('click', async () => {
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            if (confirm("You need to login to save vocabulary and track history. Go to Login page?")) {
                window.location.href = "login.html";
            }
            return;
        }
        
        const meaning = document.getElementById('popupMeaning').textContent;
        let translationResult = document.getElementById('translationResult').textContent;
        
        // Auto-translate if empty
        if (!translationResult) {
            try {
                const btn = document.getElementById('saveWordBtn');
                btn.textContent = "Translating...";
                
                const lang = document.getElementById('targetLanguage').value;
                const transData = new URLSearchParams();
                transData.append('word', currentWord);
                transData.append('target_language', lang);
                const tRes = await fetch(resolveApiUrl('/translate'), { method: 'POST', body: transData });
                const tJson = await tRes.json();
                translationResult = tJson.translation || "";
            } catch (e) {
                console.error("Auto-translate failed", e);
            }
        }
        
        const formData = new URLSearchParams();
        formData.append('user_id', userId);
        formData.append('pdf_id', currentPdfId);
        formData.append('word', currentWord);
        formData.append('meaning', meaning);
        formData.append('translation', translationResult);
        formData.append('language', 'English');
        formData.append('page', pageNum);
        
        try {
            const res = await fetch(resolveApiUrl("/vocabulary"), {
                method: 'POST',
                body: formData
            });
            if(res.ok) {
                const btn = document.getElementById('saveWordBtn');
                btn.textContent = "Saved!";
                btn.classList.replace('primary-btn', 'secondary-btn');
                setTimeout(() => {
                    btn.textContent = "Save to Vocabulary";
                    btn.classList.replace('secondary-btn', 'primary-btn');
                }, 2000);
            } else {
                alert("Failed to save word.");
            }
        } catch(e) {
            console.error(e);
        }
    });

    // --- Auth & Session Logic ---
    const currentUserId = localStorage.getItem('user_id');
    const currentUserName = localStorage.getItem('user_name');
    const loginTime = localStorage.getItem('login_time');
    
    if (currentUserId) {
        const loginBtn = document.getElementById('navLoginBtn');
        if (loginBtn) loginBtn.classList.add('hidden');
        
        const authUi = document.getElementById('authUi');
        if (authUi) {
            authUi.classList.remove('hidden');
            // Needed because hidden uses !important in CSS
            authUi.style.setProperty('display', 'flex', 'important'); 
        }
        
        const nameEl = document.getElementById('navUserName');
        if (nameEl) nameEl.textContent = `Hi, ${currentUserName}`;
        
        const navMainBtn = document.getElementById('navMainBtn');
        if (navMainBtn) navMainBtn.classList.remove('hidden');
        
        const landingGuestUi = document.getElementById('landingGuestUi');
        if (landingGuestUi) landingGuestUi.classList.add('hidden');
        
        const landingAuthUi = document.getElementById('landingAuthUi');
        if (landingAuthUi) {
            landingAuthUi.classList.remove('hidden');
            landingAuthUi.style.setProperty('display', 'flex', 'important');
        }
        
        const landingUserName = document.getElementById('landingUserName');
        if (landingUserName) landingUserName.textContent = `Welcome, ${currentUserName}`;
        
        const landingLogoutBtn = document.getElementById('landingLogoutBtn');
        if (landingLogoutBtn) {
            landingLogoutBtn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = "index.html?home=true";
            });
        }
        
        // Start timer
        const timerEl = document.getElementById('navTimer');
        if (timerEl && loginTime) {
            setInterval(() => {
                const diff = Math.floor((Date.now() - parseInt(loginTime)) / 1000);
                const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
                const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                const secs = String(diff % 60).padStart(2, '0');
                timerEl.textContent = `${hrs}:${mins}:${secs}`;
            }, 1000);
        }
        
        // Logout
        const logoutBtn = document.getElementById('navLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('login_time');
                window.location.reload();
            });
        }
    }

    // --- History Sync Logic ---
    let historySyncTimeout;
    async function syncHistory(pageNumber) {
        const userId = localStorage.getItem('user_id');
        if (!userId || !currentPdfId || currentPdfId === 'unknown') return;
        
        const fileUrl = localStorage.getItem('lastPdfUrl') || currentPdfId;
        const title = currentPdfId.replace('.pdf', '');
        
        const formData = new URLSearchParams();
        formData.append('user_id', userId);
        formData.append('pdf_id', currentPdfId);
        formData.append('title', title);
        formData.append('file_url', fileUrl);
        formData.append('last_page', pageNumber);
        
        try {
            await fetch(resolveApiUrl('/history'), { method: 'POST', body: formData });
        } catch(e) {
            console.error("Failed to sync reading history", e);
        }
    }
}
