const RouteRegistry = require('./RouteRegistry');
const MiddlewarePipeline = require('./MiddlewarePipeline');

class RouterContext {
    RouteRegistry = new RouteRegistry();
    MiddlewarePipeline = new MiddlewarePipeline();
}

module.exports = RouterContext;
