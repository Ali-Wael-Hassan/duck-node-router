const fs = require('node:fs/promises');
const path = require('node:path');

const { MIME } = require('../utils');

const resolve = (root) => {
    root = path.resolve(root);

    return async (req, res, next) => {
        const filePath = path.resolve(root, '.' + req.url);

        if (!filePath.startsWith(root))
            return next();

        try {
            const stat = await fs.stat(filePath);

            if (!stat.isFile())
                return next();

            req.context.file = {
                path: filePath,
                stat,
                mime: MIME.getType(filePath)
            };

            return next();
        } catch {
            return next();
        }
    };
};

module.exports = resolve;