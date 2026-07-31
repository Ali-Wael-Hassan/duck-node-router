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

    execute(req, res, next) {
        let index = 0;
        let inFlight = 0;
        let settled = false;

        return new Promise((resolve) => {
            const settle = () => {
                if (settled)
                    return;

                settled = true;
                next?.();
                resolve();
            };

            const check = () => {
                if (inFlight === 0)
                    settle();
            };

            const run = async (err) => {
                if (err) {
                    await this.#executeError(err, req, res, run);
                    check();
                    return;
                }

                if (index >= this.#middlewares.length) {
                    check();
                    return;
                }

                const middleware = this.#middlewares[index++];

                inFlight++;

                try {
                    await middleware(req, res, run);
                } catch (error) {
                    await this.#executeError(error, req, res, run);
                } finally {
                    inFlight--;
                    check();
                }
            };

            run();
        });
    }

    async #executeError(err, req, res, next) {
        let index = 0;

        const runError = async (error) => {
            if (!error || index >= this.#errorMiddlewares.length) {
                return next?.();
            }

            const middleware = this.#errorMiddlewares[index++];

            await middleware(error, req, res, runError);
        };

        await runError(err);
    }
}

module.exports = MiddlewarePipeline;
