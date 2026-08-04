(function () {
    const configuredBase = window.__WORDLENS_API_BASE__;
    const metaBase = document.querySelector('meta[name="api-base"]')?.content;
    let apiBase = configuredBase || metaBase || "";

    if (!apiBase) {
        const hostname = window.location.hostname;
        if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
            apiBase = "http://localhost:8000/api";
        } else {
            apiBase = "/api";
        }
    }

    window.__WORDLENS_API_BASE__ = apiBase.replace(/\/$/, "");

    window.wordLensResolveUrl = function (url) {
        if (!url) return url;
        if (/^https?:\/\//i.test(url)) return url;

        if (url.startsWith("/")) {
            if (window.__WORDLENS_API_BASE__.startsWith("http")) {
                try {
                    const base = new URL(window.__WORDLENS_API_BASE__);
                    return `${base.origin}${url}`;
                } catch (err) {
                    return `http://localhost:8000${url}`;
                }
            }

            if (window.location.origin && window.location.origin !== "null") {
                return `${window.location.origin}${url}`;
            }

            return `http://localhost:8000${url}`;
        }

        return url;
    };
})();