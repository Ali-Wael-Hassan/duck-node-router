# Overview

A lightweight **Express-inspired HTTP Router** built from scratch using Node.js.

The goal of this project is to understand how modern web frameworks are designed internally by implementing the routing engine, middleware pipeline, request dispatcher, and modular architecture instead of relying on existing frameworks.

The router is intentionally focused on **routing and request orchestration**. Features such as request parsing, static file serving, logging, compression, HTML transformation, and live reloading are implemented as reusable middleware built on top of the router instead of being embedded into its core.

---

# Architecture

```text
                   Application
                        │
                        ▼
                      Router
                  ┌─────┴─────┐
                  ▼           ▼
         RequestDispatcher  RouterContext
                  │           │
                  │      ┌────┴────┐
                  │      ▼         ▼
                  │ RouteRegistry MiddlewarePipeline
                  │      │
                  │      ▼
                  │   RouteTrie
                  ▼
             Route Handler
```

| Component | Responsibility |
|-----------|----------------|
| **Router** | Public API (`get`, `post`, `put`, `patch`, `delete`, `use`) |
| **RouterContext** | Owns and exposes the router's internal services |
| **RequestDispatcher** | Coordinates the complete request lifecycle |
| **RouteRegistry** | Route registration, validation, and lookup |
| **RouteTrie** | Efficient route storage and matching |
| **MiddlewarePipeline** | Executes middleware and error middleware |

> The router core is intentionally independent of higher-level features. Request parsing, static file serving, logging, compression, HTML transformation, and live reloading are implemented as middleware, allowing them to be composed without modifying the routing engine.

---

# Folder Structure

 ```text
src/
│
├── router/
│   ├── Router.js
│   ├── RouterContext.js
│   ├── RequestDispatcher.js
│   ├── RouteRegistry.js
│   ├── RouteTrie.js
│   ├── MiddlewarePipeline.js
│   └── index.js
│
├── middleware/
│   ├── bodyParser.js
│   ├── cors.js
│   ├── directory.js
│   ├── injectScript.js
│   ├── logger.js
│   ├── static.js
│   ├── watch.js
│   └── index.js
│
├── utils/
│   ├── MIME.js
│   ├── normalizeUrl.js
│   └── index.js
│
└── index.js

tests/
│
└── index.js

examples/
│
└── index.js

package.json
```

---

# Example

A full working example is at [`examples/index.js`](examples/index.js). It starts an HTTP server with all HTTP methods, route params, wildcards, query parsing, body parsing, logging, and CORS.

```sh
npm run example
```

```js
const http = require('node:http');
const { Router } = require('../src');
const { bodyParser, logger, cors } = require('../src/middleware');

const app = new Router();
const PORT = 3000;

app.use(logger());
app.use(cors());
app.use(bodyParser());

app.get('/users', (req, res) => {
    res.end(JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]));
});

app.get('/users/:id', (req, res) => {
    res.end(JSON.stringify({ id: Number(req.params.id), name: `User ${req.params.id}` }));
});

app.post('/users', (req, res) => {
    res.statusCode = 201;
    res.end(JSON.stringify({ created: req.body }));
});

app.put('/users/:id', (req, res) => {
    res.end(JSON.stringify({ updated: req.body, id: Number(req.params.id) }));
});

app.patch('/users/:id', (req, res) => {
    res.end(JSON.stringify({ patched: true, id: Number(req.params.id), changes: req.body }));
});

app.delete('/users/:id', (req, res) => {
    res.end(JSON.stringify({ deleted: Number(req.params.id) }));
});

app.get('/search', (req, res) => {
    res.end(JSON.stringify({ query: req.query }));
});

app.get('/files/*', (req, res) => {
    res.end(JSON.stringify({ path: req.params['*'] }));
});

const server = http.createServer((req, res) => app.handle(req, res));
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
```

---

# Tests

50 tests covering all modules, using Node's built-in test runner (`node:test`).

```sh
npm test
```

| Module | Tests |
|--------|-------|
| **RouteTrie** | Static/param/wildcard matching, multi-param, precedence, duplicate detection, method isolation |
| **RouteRegistry** | Registration, lookup, miss |
| **MiddlewarePipeline** | Execution order, async, next callback, error catching, arity validation |
| **RequestDispatcher** | Dispatch flow, params attachment, 404, middleware interop, URL normalization |
| **Router** | All HTTP methods, end-to-end requests, middleware registration, 404 |
| **normalizeUrl** | Query parsing, hash removal, slash normalization, originalUrl |
| **MIME** | Known types, unknown types, case insensitivity |
| **bodyParser** | JSON, urlencoded, plain text, empty body, malformed JSON, stream errors |
| **logger** | Log output on response finish |
| **cors** | Default headers, origin restriction, OPTIONS preflight |
| **injectScript** | HTML injection, non-HTML passthrough |
| **directory** | Directory listing, index.html, non-directory fallthrough, missing dir |
| **watch** | SSE endpoint, non-livereload passthrough |
| **Integration** | Full HTTP server with GET, 404, body parsing, CORS |

# Roadmap

## ✅ Completed

### Core Architecture

- [x] Express-inspired Router API
- [x] Layered architecture
- [x] Router Context
- [x] Request Dispatcher
- [x] Middleware Pipeline
- [x] Separation of API, orchestration, routing logic, and storage

### Routing Engine

- [x] Character-based Route Trie
- [x] Cache-friendly array-based implementation
- [x] O(L) route lookup (L = URL length)
- [x] Static route matching
- [x] Route parameters (`:param`)
- [x] Wildcard routes (`*`)
- [x] Route precedence (Static > Parameter > Wildcard)
- [x] Duplicate route detection
- [x] Automatic `req.params` extraction

### Middleware Engine

- [x] Synchronous middleware
- [x] Asynchronous middleware
- [x] Error middleware
- [x] Onion execution model

### Utilities

- [x] URL normalization
- [x] MIME type mapping

### Built-in Middleware

- [x] Body parser
- [x] Logger
- [x] Static file middleware
- [x] HTML script injection middleware
- [x] Live reload middleware
- [x] CORS
- [x] Directory listing
- [x] Test suite (50 tests)

---

## 🚧 In Progress

- [ ] Request wrapper
- [ ] Response wrapper

---

## 📅 Planned

### Router Features

- [ ] Route groups
- [ ] Nested routers
- [ ] Router mounting

### Additional Middleware

- [ ] Compression
- [ ] Cookie parser
- [ ] Session middleware
- [ ] Rate limiting

### Projects Built on the Router

- [ ] Static File Server
- [ ] Live Server
- [ ] File Explorer Server
- [ ] Reverse Proxy
- [ ] MCP Server

### Long-Term

- [ ] Plugin system
- [ ] Performance benchmarks
- [ ] Documentation on Medium