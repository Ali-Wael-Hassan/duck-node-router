const cors = (options = {}) => {
    let {
        origin = "*",
        methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        headers = ["Content-Type", "Authorization"]
    } = options;

    methods = Array.isArray(methods)
        ? methods.join(", ")
        : methods;

    headers = Array.isArray(headers)
        ? headers.join(", ")
        : headers;

    const allowAll = origin === "*";
    const allowedOrigins = Array.isArray(origin)
        ? new Set(origin)
        : null;

    return (req, res, next) => {
        const requestOrigin = req.headers.origin;

        if (allowAll) {
            res.setHeader("Access-Control-Allow-Origin", "*");
        } else if (typeof origin === "string") {
            res.setHeader("Access-Control-Allow-Origin", origin);
        } else if (allowedOrigins.has(requestOrigin)) {
            res.setHeader("Access-Control-Allow-Origin", requestOrigin);
        }

        res.setHeader("Access-Control-Allow-Methods", methods);
        res.setHeader("Access-Control-Allow-Headers", headers);

        if (req.method === "OPTIONS") {
            res.writeHead(204);
            return res.end();
        }

        next();
    };
};

module.exports = cors;