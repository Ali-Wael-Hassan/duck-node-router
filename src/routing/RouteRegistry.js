const RouteTrie = require('./RouteTrie');

class RouteRegistry {
    #trie = new RouteTrie();

    register(method, path, handler) {
        this.#trie.insert(method, path, handler);
    }

    find(method, path) {
        return this.#trie.find(method, path);
    }
}

module.exports = RouteRegistry;