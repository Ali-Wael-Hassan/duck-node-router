# Overview

A lightweight **Express-inspired HTTP Router** built from scratch using Node.js.

The goal of this project is to understand how modern web frameworks are designed internally by implementing the routing engine, middleware pipeline, request dispatcher, and extensible architecture instead of relying on existing frameworks.

The router is designed around clear separation of responsibilities, making each component independently extensible while remaining simple enough to understand from the ground up.

---

# Architecture

```
                   Application
                        │
                        ▼
                      Router
                        │
                        ▼
                 RequestDispatcher
                        │
                        ▼
                  IRouterContext
                        │
 ┌──────────────────────┼─────────────────────┐
 ▼                      ▼                     ▼
RouteRegistry   MiddlewarePipeline     StaticManager
      │
      ▼
 RouteTrie
```

| Component | Responsibility |
|-----------|----------------|
| **Router** | Public API (`get`, `post`, `put`, `patch`, `delete`, `use`) |
| **RequestDispatcher** | Orchestrates the complete request lifecycle |
| **RouteRegistry** | Routing domain logic (registration, validation, lookup) |
| **RouteTrie** | Efficient route storage and matching |
| **MiddlewarePipeline** | Middleware execution pipeline |
| **StaticManager** | Static asset management |

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
├── static/
│   ├── StaticManager.js
│   └── MIME.js
│
└── index.js
```

---

# Example

```js
const app = new Router();

app.use(logger);

app.get("/users/:id", (req, res) => {
    res.end(req.params.id);
});

await app.handle(req, res);
```

---

# Roadmap

## ✅ Completed

### Core Architecture

- [x] Express-inspired Router API
- [x] Layered architecture
- [x] Router Context abstraction
- [x] Request Dispatcher
- [x] Middleware Pipeline abstraction
- [x] Static Manager abstraction
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

---

## 🚧 In Progress

- [ ] Middleware execution
- [ ] Error middleware
- [ ] Static file serving
- [ ] Async request dispatching

---

## 📅 Planned

### Router Features

- [ ] Route normalization
- [ ] Route groups
- [ ] Nested routers
- [ ] Router mounting
- [ ] Query string parsing
- [ ] Request wrapper
- [ ] Response wrapper

### Projects Built on the Router

- [ ] Static File Server
- [ ] Live Server
- [ ] File Explorer Server
- [ ] Reverse Proxy
- [ ] MCP Server

### Long-Term

- [ ] Mini Express Framework
- [ ] Plugin system
- [ ] Performance benchmarks
- [ ] Documentation website