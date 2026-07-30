class RequestDispatcher {
    async dispatch(req, res, context) {
        const route = context.RouteRegistry.find(req.method, req.url);

        if (route) {
            req.params = route.params;
        }

        await context.MiddlewarePipeline.execute(req, res);

        // Middleware already handled the request
        if (res.writableEnded)
            return;

        if (!route) {
            res.statusCode = 404;
            res.end("Not Found");
            return;
        }

        await route.handler(req, res);
    }
}

module.exports = RequestDispatcher;