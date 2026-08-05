(function () {
    const configuredBase = window.__Lexiconz_API_BASE__;
    const metaBase = document.querySelector('meta[name="api-base"]')?.content;
    let apiBase = configuredBase || metaBase || "";

    if (!apiBase) {
        const hostname = window.location.hostname;
        if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
            apiBase = "/api";
        } else {
            apiBase = "/api";
        }
    }

    window.__Lexiconz_API_BASE__ = apiBase.replace(/\/$/, "");

    window.LexiconzResolveUrl = function (url) {
        if (!url) return url;
        if (/^https?:\/\//i.test(url)) return url;

        if (url.startsWith("/")) {
            if (window.__Lexiconz_API_BASE__.startsWith("http")) {
                try {
                    const base = new URL(window.__Lexiconz_API_BASE__);
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
    };
})();