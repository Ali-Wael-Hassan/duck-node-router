# Overview

A lightweight **Express-inspired HTTP Router** built from scratch using Node.js.

The goal of this project is to understand how modern web frameworks are designed internally by implementing the routing engine, middleware pipeline, request dispatcher, and modular architecture instead of relying on existing frameworks.

The router is intentionally focused on **routing and request orchestration**. Features such as request parsing, static file serving, logging, compression, HTML transformation, and live reloading are implemented as reusable middleware built on top of the router instead of being embedded into its core.

---

# Architecture

## Router

The router core only handles routing and request orchestration. It exposes the public API (`get`, `post`, `put`, `patch`, `delete`, `use`) and coordinates the request lifecycle through two collaborators: `RequestDispatcher` and `RouterContext`.

```text
              Router
                │  owns
     ┌──────────┴──────────┐
     ▼                     ▼
RequestDispatcher    RouterContext
     │                     │
     │              ┌──────┴──────┐
     │              ▼             ▼
     │        RouteRegistry  MiddlewarePipeline
     │              │
     │              ▼
     │           RouteTrie
     ▼
Route Handler
```

| Component | Responsibility |
|-----------|----------------|
| **Router** | Public API (`get`, `post`, `put`, `patch`, `delete`, `use`); returns a callable function that can itself be mounted as a nested router |
| **RouterContext** | Owns and exposes the router's internal services |
| **RequestDispatcher** | Coordinates the complete request lifecycle |
| **RouteRegistry** | Route registration, validation, and lookup |
| **RouteTrie** | Efficient route storage and matching |
| **MiddlewarePipeline** | Executes middleware and error middleware |

> A `Router` is a callable function (`async (req, res, next) => …`) that carries the bound route/middleware methods. Because of this, a router can be registered as a handler on another router (`app.get('/api', apiRouter)`) to create nested/mounted routers. See [Nested Routers](#nested-routers).

> The router core is intentionally independent of higher-level features. Request parsing, static file serving, logging, compression, HTML transformation, and live reloading are implemented as middleware, allowing them to be composed without modifying the routing engine.

---

## StaticServer

`StaticServer` builds on the router by composing it with built-in middleware. The `static` middleware is itself a composed pipeline (`resolve → cache → stream → compress → send`) built on the same `MiddlewarePipeline` used by the router.

```text
StaticServer
    │  uses
    ▼
 Router  ◄── middleware pipeline (logger → cors → directory → static)
    │
    └── static middleware (composed: resolve → cache → stream → compress → send)
```

| Component | Responsibility |
|-----------|----------------|
| **StaticServer** | Ready-to-use static file server built on the router + built-in middleware |
| **static middleware** | Composed pipeline serving files from `root` with caching and compression |

The static pipeline communicates through `req.context` (never by mutating `req` directly): `resolve` sets `req.context.file` (`{ path, stat, mime }`), `cache` computes `req.context.range` for `Range` requests, `stream` opens `req.context.stream`, and `send` pipes it to the response.

---

## LiveServer

`LiveServer` extends `StaticServer`'s design with development features: a `watch` middleware streams reload events over SSE (`/__live_reload`), and an `injectScript` middleware injects the `liveReloadClient` script into served HTML so the browser auto-refreshes on change.

```text
LiveServer
    │  uses
    ▼
 Router  ◄── middleware pipeline (logger → cors → watch → injectScript → directory → static)
    │
    ├── watch middleware        ── SSE reload events at /__live_reload
    ├── injectScript middleware ── injects liveReloadClient into HTML
    └── static middleware       (composed: resolve → cache → stream → compress → send)
```

| Component | Responsibility |
|-----------|----------------|
| **LiveServer** | Development HTTP server with live reload on top of the static pipeline |
| **watch middleware** | Watches `root` and broadcasts reload events over SSE |
| **injectScript middleware** | Injects the `liveReloadClient` script into HTML responses |
| **liveReloadClient** | Browser-side script that listens for reload events and refreshes the page |

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
│   ├── cache.js
│   ├── compress.js
│   ├── cors.js
│   ├── directory.js
│   ├── injectScript.js
│   ├── logger.js
│   ├── resolve.js
│   ├── send.js
│   ├── static.js
│   ├── stream.js
│   ├── watch.js
│   └── index.js
│
├── server/
│   ├── StaticServer.js
│   ├── LiveServer.js
│   ├── liveReloadClient.js
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
├── index.js
└── nestedRoutes.js

examples/
│
└── index.js

docs/
│
├── class diagrams/
└── sequence diagrams/

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

app.get('/', (req, res) => {
    res.end('Hello from Router!');
});

app.get('/users', (req, res) => {
    res.end(JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
    ]));
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

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
```

---

# Nested Routers

A `Router` is a callable function, so it can be registered as a handler on another router to create nested (mounted) routers:

```js
const { Router } = require('./src');

const users = new Router();

users.get('/', (req, res) => res.end('User list'));
users.get('/:id', (req, res) => res.end(`User ${req.params.id}`));

const app = new Router();

app.get('/users', users);       // mount at /users
app.get('/health', (req, res) => res.end('ok'));
```

| Request | Handler |
|---------|---------|
| `GET /users` | nested `users` router root |
| `GET /users/42` | nested `users` router `/:id` (params extracted) |
| `GET /health` | parent `app` handler |

Mounting a nested router at `/users` registers both `/users` and `/users/*`, so every path under the mount prefix is forwarded to the nested router after the prefix is stripped. Queries are preserved (`req.query`), middleware runs on both sides, and params from the parent and nested routers are merged onto `req.params`. Precedence is still applied across the whole tree, so a static parent route like `/users/me` wins over a nested `/:id`.

Routers can be nested arbitrarily deep:

```js
const inner = new Router();
inner.get('/deep', (req, res) => res.end('deep'));

const mid = new Router();
mid.get('/sub', inner);

const app = new Router();
app.get('/api', mid);           // GET /api/sub/deep -> 'deep'
```

> Nesting is detected via a symbol tag set on every router (`ROUTER_SYMBOL`), so any function or object registered as a handler that is a router gets mounted automatically. See [`src/router/Router.js`](src/router/Router.js).

---

# Static File Server

`src/server/StaticServer.js` bundles the router with the static-serving middleware into a ready-to-use HTTP server.

```js
const { StaticServer } = require('./src/server');

const server = new StaticServer({
    root: './public',
    directoryListing: true,       // serve directory listings
    cors: { origin: '*' },        // enable CORS (use false to disable)
    cache: { maxAge: 3600 },      // ETag / Last-Modified / Range caching
    compression: { gzip: true }   // gzip / brotli compression
});

server.listen(3000);
```

| Option | Default | Description |
|--------|---------|-------------|
| `root` | `'.'` | Directory to serve |
| `directoryListing` | `false` | Generate directory listings via the `directory` middleware |
| `cors` | `false` | CORS options, `false` disables it |
| `cache` | `{}` | Cache / ETag / Range options passed to the `cache` middleware |
| `compression` | `{}` | gzip / brotli options passed to the `compress` middleware |


---

# Live Server

`src/server/LiveServer.js` bundles the router with static-serving middleware and live reload capabilities into a ready-to-use development HTTP server.

```js
const { LiveServer } = require('./src/server');

const server = new LiveServer({
    root: './public',
    directoryListing: true,        // serve directory listings
    cors: { origin: '*' },         // enable CORS (use false to disable)
    cache: { maxAge: 3600 },       // ETag / Last-Modified / Range caching
    compression: { gzip: true },   // gzip / brotli compression
    liveReload: true,              // enable browser auto refresh
    inject: true                   // inject live reload script into HTML
});

server.listen(3000);
```

| Option | Default | Description |
|--------|---------|-------------|
| `root` | `'.'` | Directory to serve |
| `directoryListing` | `true` | Generate directory listings via the `directory` middleware |
| `cors` | `false` | CORS options, `false` disables it |
| `cache` | `{}` | Cache / ETag / Range options passed to the `cache` middleware |
| `compression` | `{}` | gzip / brotli options passed to the `compress` middleware |
| `liveReload` | `true` | Enable file watching and browser reload notifications |
| `inject` | `true` | Inject live reload client script into HTML responses |

---

# Tests

76 tests covering all modules, using Node's built-in test runner (`node:test`).

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
| **Nested Routes** | Prefix stripping, nested params, query forwarding, nested middleware, all HTTP methods, nested + normal route interop, deep nesting, precedence |

> See [Known Issues](#known-issues) — the `watch` middleware leaks an `fs.watch` handle, which can prevent `npm test` from exiting.

---

# Known Issues

- **`watch` middleware leaks an `fs.watch` handle.** `watch()` calls `fs.watch(directory, { recursive: true }, ...)` once at setup and never closes it. Running the full test suite therefore leaves an active handle that prevents `node --test` from exiting; on Windows the recursive watcher over a removed directory can also keep allocating until the process runs out of memory. To work around it, run a targeted subset, e.g.:

```sh
node --test --test-name-pattern="MiddlewarePipeline" tests/index.js
```

---

# Roadmap

## ✅ Completed

### Core Architecture

- [x] Express-inspired Router API
- [x] Layered architecture
- [x] Router Context
- [x] Request Dispatcher
- [x] Middleware Pipeline
- [x] Separation of API, orchestration, routing logic, and storage

### Request / Response Wrappers

- [x] `Request` wrapper around `http.IncomingMessage` (`req.get`, `req.params`, `req.query`, `req.body`, `req.accepts`, `req.is`, `req.param`, `req.xhr`, `req.context.file` / `req.context.stream` / `req.context.range`, …)
- [x] `Response` wrapper around `http.ServerResponse` (`res.status`, `res.set`, `res.send`, `res.json`, `res.html`, `res.redirect`, `res.download`, `res.sendFile`, cookies, …)
- [x] Router, dispatcher, middleware pipeline, and every built-in middleware now operate on the wrappers instead of raw Node objects

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
- [x] Static file middleware (composed pipeline: resolve → cache → stream → compress → send)
- [x] HTML script injection middleware
- [x] Live reload middleware
- [x] CORS
- [x] Directory listing
- [x] HTTP caching (ETag, Last-Modified, Range requests)
- [x] Compression (gzip, brotli)
- [x] Nested / mounted routers (`router.get(url, anotherRouter)`)
- [x] Test suite (76 tests)

### Projects Built on the Router

- [x] Static file server (`StaticServer`)
- [x] Live Server (`LiveServer`)

---

## 🚧 In Progress

- [ ] Fix `watch` middleware `fs.watch` handle leak (see [Known Issues](#known-issues))

---

## 📅 Planned

### Router Features

- [ ] Route groups
- [ ] Mounting middleware (`use('/path', mw)`) with path prefixes

### Additional Middleware

- [ ] Cookie parser
- [ ] Session middleware
- [ ] Rate limiting

### Projects Built on the Router

- [ ] File Explorer Server
- [ ] Reverse Proxy
- [ ] MCP Server

### Long-Term

- [ ] Plugin system
- [ ] Performance benchmarks
- [ ] Documentation on Medium
