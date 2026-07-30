# Overview

A lightweight **Express-inspired HTTP Router** built from scratch using Node.js.

The goal of this project is to understand how modern web frameworks are designed internally by implementing the routing engine, middleware pipeline, request dispatcher, and modular architecture instead of relying on existing frameworks.

The router is intentionally kept focused on **routing and request orchestration**. Features such as static file serving, logging, compression, and live reloading are designed as reusable middleware rather than built into the router itself.

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
| **RouterContext**      | Owns the router's internal services                         |
| **RequestDispatcher**  | Coordinates the request lifecycle                           |
| **RouteRegistry**      | Route registration, validation, and lookup                  |
| **RouteTrie**          | Efficient route storage and matching                        |
| **MiddlewarePipeline** | Executes middleware and error middleware                    |

> The router core is intentionally independent of built-in features. Static file serving, logging, compression, live reloading, and similar functionality are implemented as middleware on top of the routing engine.

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
│   └── MiddlewarePipeline.js
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

---

## 🚧 In Progress

* [x] Middleware execution
* [x] Error middleware
* [ ] Request dispatcher implementation
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
