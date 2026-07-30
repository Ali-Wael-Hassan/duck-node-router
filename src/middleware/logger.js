const logger = () => {
    return (req, res, next) => {
        const start = performance.now();

        res.on("finish", () => {
            const elapsed = (performance.now() - start).toFixed(2);

            console.log(
                `[${req.method}] ${req.originalUrl} ${res.statusCode} ${elapsed}ms`
            );
        });

        next();
    };
};

module.exports = logger;