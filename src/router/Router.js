const RouterContext = require("./RouterContext");
const RequestDispatcher = require("./RequestDispatcher");

class Router {
    #context = new RouterContext();
    #dispatcher = new RequestDispatcher();

    get(path, handler) {
        this.#context.RouteRegistry.register("GET", path, handler);
    }

    post(path, handler) {
        this.#context.RouteRegistry.register("POST", path, handler);
    }

    put(path, handler) {
        this.#context.RouteRegistry.register("PUT", path, handler);
    }

    patch(path, handler) {
        this.#context.RouteRegistry.register("PATCH", path, handler);
    }

    delete(path, handler) {
        this.#context.RouteRegistry.register("DELETE", path, handler);
    }

    use(middleware) {
        this.#context.MiddlewarePipeline.use(middleware);
    }

    async handle(req, res) {
        await this.#dispatcher.dispatch(req, res, this.#context);
    }
}

module.exports = Router;