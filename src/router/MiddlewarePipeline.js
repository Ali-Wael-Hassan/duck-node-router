class MiddlewarePipeline {
    #middlewares = [];
    #errorMiddlewares = [];

    use(middleware) {
        if (middleware.length === 3) {
            this.#middlewares.push(middleware);
            return;
        }

        if (middleware.length === 4) {
            this.#errorMiddlewares.push(middleware);
            return;
        }

        throw new Error(
            'middleware function should be either (req, res, next) or (err, req, res, next)'
        );
    }


    async execute(req, res, next) {
        let index = 0;

        const run = async (err) => {
            if (err) {
                return await this.#executeError(err, req, res, next);
            }

            if (index >= this.#middlewares.length) {
                return next?.();
            }

            const middleware = this.#middlewares[index++];

            await middleware(req, res, run);
        };

        try {
            await run();
        } catch (err) {
            await this.#executeError(err, req, res, next);
        }
    }


    async #executeError(err, req, res, next) {
        let index = 0;

        const runError = async (error = err) => {
            if (index >= this.#errorMiddlewares.length) {
                return next?.(error);
            }

            const middleware = this.#errorMiddlewares[index++];

            await middleware(error, req, res, runError);
        };

        await runError();
    }
}

module.exports = MiddlewarePipeline;