const rateLimit = ({
    windowMs = 60_000,
    max = 100,
    keyGenerator = req => req.ip,
    message = { error: "Too Many Requests" },
    statusCode = 429,
    skip = null,
    onLimitReached = null
} = {}) => {
    const store = new Map();

    const cleanup = () => {
        const now = Date.now();

        for (const [key, entry] of store) {
            if (now >= entry.resetAt)
                store.delete(key);
        }
    };

    return (req, res, next) => {
        if (skip?.(req))
            return next();

        const key = keyGenerator(req);
        const now = Date.now();

        let entry = store.get(key);

        if (!entry || now >= entry.resetAt) {
            cleanup();
            entry = { count: 0, resetAt: now + windowMs };
        }

        entry.count++;
        store.set(key, entry);

        const remaining = Math.max(0, max - entry.count);
        const reset = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

        res.set("RateLimit-Limit", String(max));
        res.set("RateLimit-Remaining", String(remaining));
        res.set("RateLimit-Reset", String(reset));

        if (entry.count > max) {
            onLimitReached?.(req, res, entry);

            return res
                .status(statusCode)
                .set("Retry-After", String(reset))
                .json(message);
        }

        next();
    };
};

module.exports = rateLimit;