const crypto = require('crypto');

const cache = ({
    maxAge = 3600,
    etag = true,
    lastModified = true
} = {}) => (req, res, next) => {
    if (!req.file)
        return next();

    const { stat } = req.file;

    res.setHeader(
        'Cache-Control',
        `public, max-age=${maxAge}`
    );


    if (lastModified) {
        const modified = stat.mtime.toUTCString();

        res.setHeader('Last-Modified', modified);

        if (req.headers['if-modified-since'] === modified) {
            res.statusCode = 304;
            return res.end();
        }
    }

    if (etag) {
        const tag = crypto
            .createHash('sha1')
            .update(`${stat.size}:${stat.mtimeMs}`)
            .digest('hex');

        res.setHeader('ETag', tag);

        if (req.headers['if-none-match'] === tag) {
            res.statusCode = 304;
            return res.end();
        }
    }
    
    res.setHeader('Accept-Ranges', 'bytes');

    const header = req.headers.range;

    if (header) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(header);

        if (!match) {
            res.statusCode = 416;
            return res.end();
        }

        const size = stat.size;

        let start = match[1] === '' ? 0 : Number(match[1]);
        let end = match[2] === '' ? size - 1 : Number(match[2]);

        if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
            res.statusCode = 416;
            return res.end();
        }

        req.range = { start, end };

        res.statusCode = 206;

        res.setHeader(
            'Content-Range',
            `bytes ${start}-${end}/${size}`
        );

        res.setHeader(
            'Content-Length',
            end - start + 1
        );
    }
    
    next();
};

module.exports = cache;