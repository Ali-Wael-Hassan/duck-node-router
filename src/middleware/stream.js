const fs = require('fs');

const stream = () => (req, res, next) => {
    if (!req.context.file)
        return next();

    if (!req.context.stream) {
        req.context.stream = fs.createReadStream(
            req.context.file.path,
            req.context.range
        );

        req.context.stream.on('error', next);
    }

    next();
};

module.exports = stream;