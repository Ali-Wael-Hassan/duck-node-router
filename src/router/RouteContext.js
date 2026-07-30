const MiddlewarePipeline = require('./MiddlewarePipeline');
const RouteRegistry = require('./RouteRegistry');

class RouterContext {
    #routes = new RouteRegistry();
    #middleware = new MiddlewarePipeline();

    get routeRegistry() {
        return this.#routes;
    }

    get middlewarePipeline() {
        return this.#middleware;
    }
}

module.exports = RouterContext;