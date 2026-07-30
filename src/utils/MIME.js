const path = require('path');

const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".mjs": "application/javascript",

    ".json": "application/json",
    ".xml": "application/xml",

    ".txt": "text/plain",

    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",

    ".mp4": "video/mp4",
    ".webm": "video/webm",

    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",

    ".pdf": "application/pdf",

    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",

    ".zip": "application/zip"
};

class MIME {
    static getType(filePath) {
        const extension = path.extname(filePath).toLowerCase();

        return MIME_TYPES[extension] ?? "application/octet-stream";
    }
}

module.exports = MIME;