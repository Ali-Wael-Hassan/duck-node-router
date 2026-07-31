const zlib = require('zlib');

const compress = ({
    brotli = true,
    gzip = true,
    filter = (mime) =>
        !/^(image\/|audio\/|video\/)/.test(mime) &&
        mime !== 'application/zip' &&
        mime !== 'application/gzip'
} = {}) => (req, res, next) => {

    if (!req.file || !req.stream)
        return next();

    if (!filter(req.file.mime))
        return next();

    const encoding = req.headers['accept-encoding'] || '';

    if (brotli && encoding.includes('br')) {
        res.setHeader('Content-Encoding', 'br');
        res.removeHeader('Content-Length');

        req.stream = req.stream.pipe(
            zlib.createBrotliCompress()
        );
    }
    else if (gzip && encoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        res.removeHeader('Content-Length');

        req.stream = req.stream.pipe(
            zlib.createGzip()
        );
    }

    next();
};

module.exports = compress;