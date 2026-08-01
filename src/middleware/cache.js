const crypto = require('crypto');

const cache = ({
    maxAge = 3600,
    etag = true,
    lastModified = true
} = {}) => (req, res, next) => {
    if (!req.context.file)
        return next();

    const { stat } = req.context.file;

    res.set(
        'Cache-Control',
        `public, max-age=${maxAge}`
    );


    if (lastModified) {
        const modified = stat.mtime.toUTCString();

        res.set('Last-Modified', modified);

        if (req.get('if-modified-since') === modified) {
            res.status(304);
            return res.end();
        }
    }

    if (etag) {
        const tag = crypto
            .createHash('sha1')
            .update(`${stat.size}:${stat.mtimeMs}`)
            .digest('hex');

        res.set('ETag', tag);

        if (req.get('if-none-match') === tag) {
            res.status(304);
            return res.end();
        }
    }
    
    res.set('Accept-Ranges', 'bytes');

    const header = req.get('range');

    if (header) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(header);

        if (!match) {
            res.status(416);
            return res.end();
        }

        const size = stat.size;

        let start = match[1] === '' ? 0 : Number(match[1]);
        let end = match[2] === '' ? size - 1 : Number(match[2]);

        if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
            res.status(416);
            return res.end();
        }

        req.context.range = { start, end };

        res.status(206);

        res.set(
            'Content-Range',
            `bytes ${start}-${end}/${size}`
        );

        res.set(
            'Content-Length',
            end - start + 1
        );
    }
    
    next();
};

module.exports = cache;