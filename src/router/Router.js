const RouterContext = require("./RouterContext");
const RequestDispatcher = require("./RequestDispatcher");
const Request = require("./Request");
const Response = require("./Response");

const ROUTER_SYMBOL = Symbol('Router');

function normalizeMountPath(path) {
    let mount = path;
    if (!mount.startsWith('/')) mount = '/' + mount;
    mount = mount.replace(/\/+/g, '/');
    if (mount.length > 1 && mount.endsWith('/')) mount = mount.slice(0, -1);
    return mount;
}

function mountMatches(mount, url) {
    if (mount === '/') return true;
    if (url === mount) return true;
    return url.startsWith(mount + '/');
}

function applyMount(req, mount) {
    if (mount === '/') return () => {};

    const url = req.url;
    const originalUrlField = req.originalUrl;
    const originalQuery = req.query;

    let remainder = url;
    if (remainder === mount) remainder = '/';
    else remainder = remainder.slice(mount.length);

    const queryIndex = originalUrlField ? originalUrlField.indexOf('?') : -1;
    const suffix = queryIndex === -1 ? '' : originalUrlField.slice(queryIndex);
    req.url = remainder + suffix;

    return () => {
        req.url = url;
        req.originalUrl = originalUrlField;
        req.query = originalQuery;
    };
}

function wrapMount(middleware, mount) {
    if (middleware.length === 4) {
        return async (err, req, res, next) => {
            if (!mountMatches(mount, req.url)) return next(err);

            const restore = applyMount(req, mount);
            const mountedNext = (e) => {
                restore();
                next(e);
            };

            try {
                await middleware(err, req, res, mountedNext);
            } finally {
                restore();
            }
        };
    }

    return async (req, res, next) => {
        if (!mountMatches(mount, req.url)) return next();

        const restore = applyMount(req, mount);
        const mountedNext = (e) => {
            restore();
            next(e);
        };

        try {
            await middleware(req, res, mountedNext);
        } finally {
            restore();
        }
    };
}

async function mountRouter(nested, mount, req, res) {
    const originalUrl = req.url;
    const originalUrlField = req.originalUrl;
    const originalQuery = req.query;
    const outerParams = req.params;

    let remainder = originalUrl;
    if (mount !== '/') {
        if (remainder === mount) remainder = '/';
        else if (remainder.startsWith(mount + '/')) remainder = remainder.slice(mount.length);
    }

    const queryIndex = originalUrlField ? originalUrlField.indexOf('?') : -1;
    const suffix = queryIndex === -1 ? '' : originalUrlField.slice(queryIndex);
    req.url = remainder + suffix;

    try {
        await nested(req, res);
    } finally {
        req.url = originalUrl;
        req.originalUrl = originalUrlField;
        req.query = originalQuery;
        if (outerParams) {
            delete outerParams['*'];
            req.params = Object.assign(outerParams, req.params);
        }
    }
}

class Router {
    #context = new RouterContext();
    #dispatcher = new RequestDispatcher();

    constructor() {
        const router = async (req, res, next) => {
            try {
                await this.handle(req, res);
                next?.();
            } catch (err) {
                if (typeof next === "function") next(err);
                else throw err;
            }
        };

        router[ROUTER_SYMBOL] = true;

        const proto = Object.getPrototypeOf(this);

        for (const key of Object.getOwnPropertyNames(proto)) {
            if (key === 'constructor') continue;

            const value = this[key];
            if (typeof value === 'function') {
                router[key] = value.bind(this);
            }
        }

        return router;
    }

    get(path, handler) {
        this.#register("GET", path, handler);
    }

    post(path, handler) {
        this.#register("POST", path, handler);
    }

    put(path, handler) {
        this.#register("PUT", path, handler);
    }

    patch(path, handler) {
        this.#register("PATCH", path, handler);
    }

    delete(path, handler) {
        this.#register("DELETE", path, handler);
    }

    #register(method, path, handler) {
        if (handler && handler[ROUTER_SYMBOL]) {
            const mount = normalizeMountPath(path);
            const wrapped = (req, res) => mountRouter(handler, mount, req, res);

            this.#context.RouteRegistry.register(method, mount, wrapped);
            this.#context.RouteRegistry.register(method, mount + "/*", wrapped);
            return;
        }

        this.#context.RouteRegistry.register(method, path, handler);
    }

    use(path, middleware) {
        if (typeof path === 'function') {
            middleware = path;
            path = "/";
        }

        const mount = normalizeMountPath(path);

        this.#context.MiddlewarePipeline.use(wrapMount(middleware, mount));
    }

    async handle(req, res) {
        if (!(req instanceof Request))
            req = new Request(req);

        if (!(res instanceof Response))
            res = new Response(res);

        await this.#dispatcher.dispatch(req, res, this.#context);
    }
}

module.exports = Router;
