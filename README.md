# Overview

A lightweight **Express-inspired HTTP Router** built from scratch using Node.js.

The goal of this project is to understand how modern web frameworks are designed internally by implementing the routing engine, middleware pipeline, request dispatcher, and modular architecture instead of relying on existing frameworks.

The router is intentionally focused on **routing and request orchestration**. Features such as static file serving, logging, compression, and live reloading are designed as reusable middleware built on top of the router instead of being embedded into its core.

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

| Component              | Responsibility                                              |
| ---------------------- | ----------------------------------------------------------- |
| **Router**             | Public API (`get`, `post`, `put`, `patch`, `delete`, `use`) |
| **RouterContext**      | Owns and exposes the router's internal services             |
| **RequestDispatcher**  | Coordinates the complete request lifecycle                  |
| **RouteRegistry**      | Route registration, validation, and lookup                  |
| **RouteTrie**          | Efficient route storage and matching                        |
| **MiddlewarePipeline** | Executes middleware and error middleware                    |

> The router core is intentionally independent of higher-level features. Static file serving, logging, compression, HTML transformation, and live reloading are implemented as middleware, allowing them to be composed without modifying the routing engine.

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
│   ├── RouteNode.js
│   ├── MiddlewarePipeline.js
│   └── index.js
│
├── middleware/
│   ├── static.js
│   ├── logger.js
│   ├── injectCode.js
│   └── ...
│
├── utils/
│   ├── MIME.js
│   └── ...
│
└── index.js
```

---

# Example

```js
const { Router } = require("./src");

const app = new Router();

app.use(logger());

app.get("/users/:id", (req, res) => {
    res.end(req.params.id);
});

await app.handle(req, res);
```

---

# Roadmap

## ✅ Completed

### Core Architecture

* [x] Express-inspired Router API
* [x] Layered architecture
* [x] Router Context
* [x] Request Dispatcher
* [x] Middleware Pipeline
* [x] Separation of API, orchestration, routing logic, and storage

### Routing Engine

* [x] Character-based Route Trie
* [x] Cache-friendly array-based implementation
* [x] O(L) route lookup (L = URL length)
* [x] Static route matching
* [x] Route parameters (`:param`)
* [x] Wildcard routes (`*`)
* [x] Route precedence (Static > Parameter > Wildcard)
* [x] Duplicate route detection
* [x] Automatic `req.params` extraction

### Middleware

* [x] Synchronous middleware
* [x] Asynchronous middleware
* [x] Error middleware
* [x] Onion execution model

---

## 🚧 In Progress

* [ ] Request dispatcher integration
* [ ] Async route handler support

---

## 📅 Planned

### Router Features

* [ ] Route normalization
* [ ] Route groups
* [ ] Nested routers
* [ ] Router mounting
* [ ] Query string parsing
* [ ] Request wrapper
* [ ] Response wrapper

### Built-in Middleware

* [ ] Static file middleware
* [ ] HTML response transformation
* [ ] Live reload middleware
* [ ] Logger middleware
* [ ] Compression middleware
* [ ] CORS middleware

### Projects Built on the Router

* [ ] Static File Server
* [ ] Live Server
* [ ] File Explorer Server
* [ ] Reverse Proxy
* [ ] MCP Server

### Long-Term

* [ ] Mini Express Framework
* [ ] Plugin system
* [ ] Performance benchmarks
* [ ] Documentation website
