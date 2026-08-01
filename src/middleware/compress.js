const zlib = require('zlib');

const compress = ({
    brotli = true,
    gzip = true,
    filter = (mime) =>
        !/^(image\/|audio\/|video\/)/.test(mime) &&
        mime !== 'application/zip' &&
        mime !== 'application/gzip'
} = {}) => (req, res, next) => {

    if (!req.context.file || !req.context.stream)
        return next();

    if (!filter(req.context.file.mime))
        return next();

    const encoding = req.get('accept-encoding') || '';

    if (brotli && encoding.includes('br')) {
        res.set('Content-Encoding', 'br');
        res.remove('Content-Length');

        req.context.stream = req.context.stream.pipe(
            zlib.createBrotliCompress()
        );
    }
    else if (gzip && encoding.includes('gzip')) {
        res.set('Content-Encoding', 'gzip');
        res.remove('Content-Length');

        req.context.stream = req.context.stream.pipe(
            zlib.createGzip()
        );
    }

    next();
};

module.exports = compress;