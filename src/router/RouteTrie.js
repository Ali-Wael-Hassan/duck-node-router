const METHOD = Object.freeze({
    GET: 0,
    POST: 1,
    PUT: 2,
    PATCH: 3,
    DELETE: 4
});

class RouteNode {
    constructor() {
        // ASCII transitions
        this.children = new Array(128).fill(-1);

        // Special transitions
        this.parameter = -1; // :param
        this.wildcard = -1; // *

        // One handler per HTTP method
        this.handlers = new Array(5).fill(-1);

        // Parameter names for each HTTP method
        this.parameterNames = [
            [], // GET
            [], // POST
            [], // PUT
            [], // PATCH
            []  // DELETE
        ];
    }
}

class RouteTrie {
    constructor() {
        this.nodes = [new RouteNode()];
        this.handlers = [];
    }

    allocateNode() {
        this.nodes.push(new RouteNode());
        return this.nodes.length - 1;
    }

    allocateHandler(handler) {
        this.handlers.push(handler);
        return this.handlers.length - 1;
    }

    insert(method, path, handler) {
        let current = 0;
        const methodIndex = METHOD[method];

        for (let i = 0; i < path.length;) {

            // ----------------- Parameter -----------------
            if (path[i] === ':') {

                if (this.nodes[current].parameter === -1)
                    this.nodes[current].parameter = this.allocateNode();

                let name = "";
                i++;

                while (i < path.length && path[i] !== '/') {
                    name += path[i];
                    i++;
                }

                this.nodes[current].parameterNames[methodIndex].push(name);

                current = this.nodes[current].parameter;
                continue;
            }

            // ----------------- Wildcard -----------------
            if (path[i] === '*') {

                if (this.nodes[current].wildcard === -1)
                    this.nodes[current].wildcard = this.allocateNode();

                current = this.nodes[current].wildcard;
                i++;
                break;
            }

            // ----------------- Normal Character -----------------
            const index = path.charCodeAt(i);

            if (this.nodes[current].children[index] === -1)
                this.nodes[current].children[index] = this.allocateNode();

            current = this.nodes[current].children[index];
            i++;
        }

        // Reject duplicate route patterns
        if (this.nodes[current].handlers[methodIndex] !== -1)
            throw new Error(`Duplicate route: ${method} ${path}`);

        const handlerIndex = this.allocateHandler(handler);
        this.nodes[current].handlers[methodIndex] = handlerIndex;
    }

    find(method, path) {
        let current = 0;
        const methodIndex = METHOD[method];

        const params = {};
        let backtrack = null;
        let i;

        for (i = 0; i < path.length;) {

            const index = path.charCodeAt(i);

            // ----------------- Exact Match -----------------
            if (this.nodes[current].children[index] !== -1) {
                current = this.nodes[current].children[index];
                i++;
                continue;
            }

            // ----------------- Parameter -----------------
            if (this.nodes[current].parameter !== -1) {

                let value = "";
                const start = i;

                while (i < path.length && path[i] !== '/') {
                    value += path[i];
                    i++;
                }

                if (this.nodes[current].wildcard !== -1) {
                    backtrack = { node: current, start, params: { ...params } };
                }

                params[
                    this.nodes[current]
                        .parameterNames[methodIndex][0]
                ] = value;

                current = this.nodes[current].parameter;
                continue;
            }

            // ----------------- Wildcard -----------------
            if (this.nodes[current].wildcard !== -1) {
                current = this.nodes[current].wildcard;
                params["*"] = path.substring(i);
                break;
            }

            if (backtrack) break;
            return null;
        }

        let handlerIndex = this.nodes[current].handlers[methodIndex];

        if ((handlerIndex === -1 || i < path.length) && backtrack) {
            Object.assign(params, backtrack.params);
            current = this.nodes[backtrack.node].wildcard;
            params["*"] = path.substring(backtrack.start);
            handlerIndex = this.nodes[current].handlers[methodIndex];
        }

        if (handlerIndex === -1)
            return null;

        return {
            handler: this.handlers[handlerIndex],
            params
        };
    }
}

module.exports = RouteTrie;