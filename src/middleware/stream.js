const fs = require('fs');

const stream = () => (req, res, next) => {
    if (!req.file)
        return next();

    if (!req.stream) {
        req.stream = fs.createReadStream(
            req.file.path,
            req.range
        );

        req.stream.on('error', next);
    }

    next();
};

module.exports = stream;