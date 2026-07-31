function normalizeUrl(req) {
    req.originalUrl = req.url;

    let url = decodeURIComponent(req.url);

    // Remove hash
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
        url = url.slice(0, hashIndex);
    }

    // Split path and query
    const [path, queryString = ""] = url.split('?');

    // Parse query
    req.query = {};
    
    if (queryString) {
        for (const pair of queryString.split('&')) {
            if (!pair) continue;

            const [key, value=""] = pair.split('=');

            req.query[key] = value;
        }
    }

    // Normalize path
    let normalized = path;
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }

    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');

    // Remove trailing slash (except root)
    if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
    }

    req.url = normalized;
    req.path = normalized;
}

module.exports = normalizeUrl;