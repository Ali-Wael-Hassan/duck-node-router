const bodyParser = () => {
    return (req, res, next) => {
        const chunks = [];

        req.on("data", chunk => chunks.push(chunk));

        req.on("end", () => {
            const rawBody = Buffer.concat(chunks).toString();

            if (!rawBody) {
                req.body = {};
                return next();
            }

            const contentType = (req.headers["content-type"] ?? "").split(";")[0];

            try {
                switch (contentType) {
                    case "application/json":
                        req.body = JSON.parse(rawBody);
                        break;

                    case "application/x-www-form-urlencoded": {
                        const params = new URLSearchParams(rawBody);
                        req.body = Object.fromEntries(params.entries());
                        break;
                    }

                    case "text/plain":
                        req.body = rawBody;
                        break;

                    default:
                        req.body = rawBody;
                }

                next();
            } catch (err) {
                next(err);
            }
        });

        req.on("error", next);
    };
};

module.exports = bodyParser;