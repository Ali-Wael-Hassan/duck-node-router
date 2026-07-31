const send = () => (req, res, next) => {
    if (!req.file)
        return next();

    req.handled = true;

    res.setHeader('Content-Type', req.file.mime);
    if (!res.hasHeader('Content-Length') && !res.hasHeader('Content-Encoding'))
        res.setHeader('Content-Length', req.file.stat.size);
    
    req.stream.pipe(res);
    next();
};

module.exports = send;