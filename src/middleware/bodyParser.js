const bodyParser = () => {
    return async (req, res, next) => {
        const chunks = [];

        try {
            await new Promise((resolve, reject) => {
                req.on("data", chunk => chunks.push(chunk));
                req.on("end", resolve);
                req.on("error", reject);
            });
        } catch (err) {
            return next(err);
        }

        const rawBody = Buffer.concat(chunks).toString();

        if (!rawBody) {
            req.body = {};
            return next();
        }

        const contentType = (req.get("content-type") ?? "").split(";")[0];

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
    };
};

module.exports = bodyParser;