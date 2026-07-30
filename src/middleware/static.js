const fs = require("fs");
const path = require("path");

const MIME = require("../utils/MIME");

const static = (root) => {
    root = path.resolve(root);

    return async (req, res, next) => {
        const filePath = path.resolve(root, "." + req.url);

        if (!filePath.startsWith(root)) {
            return next();
        }

        try {
            const stat = await fs.stat();

            if (!stat.isFile()) {
                return next();
            }

            res.setHeader(
                "Content-Type",
                MIME.getType(filePath)
            );

            fs.createReadStream(filePath).pipe(res);
        } catch {
            next();
        }
    };
};

module.exports = static;