const send = () => (req, res, next) => {
    if (!req.context.file)
        return next();

    req.handled = true;

    res.set('Content-Type', req.context.file.mime);
    if (!res.has('Content-Length') && !res.has('Content-Encoding'))
        res.set('Content-Length', req.context.file.stat.size);
    
    req.context.stream.pipe(res);
    next();
};

module.exports = send;