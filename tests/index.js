const { describe, it, mock } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const RouteTrie = require('../src/router/RouteTrie');
const RouteRegistry = require('../src/router/RouteRegistry');
const MiddlewarePipeline = require('../src/router/MiddlewarePipeline');
const RequestDispatcher = require('../src/router/RequestDispatcher');
const Router = require('../src/router');
const { Request, Response } = Router;
const normalizeUrl = require('../src/utils/normalizeUrl');
const MIME = require('../src/utils/MIME');
const bodyParser = require('../src/middleware/bodyParser');
const logger = require('../src/middleware/logger');
const cors = require('../src/middleware/cors');
const injectScript = require('../src/middleware/injectScript');
const directory = require('../src/middleware/directory');
const watch = require('../src/middleware/watch');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq({ method = 'GET', url = '/', headers = {} } = {}) {
    const raw = new EventEmitter();
    raw.method = method;
    raw.url = url;
    raw.headers = headers;
    return new Request(raw);
}

function mockRes() {
    const raw = new EventEmitter();
    raw.statusCode = 200;
    raw.headers = {};
    raw.writableEnded = false;
    raw.writable = true;
    raw.setHeader = (k, v) => { raw.headers[k] = v; };
    raw.getHeader = (k) => raw.headers[k];
    raw.hasHeader = (k) => k in raw.headers;
    raw.removeHeader = (k) => { delete raw.headers[k]; };
    raw.writeHead = function (code, h) { raw.statusCode = code; if (h) Object.assign(raw.headers, h); };
    raw.write = function (chunk) {
        raw.written = (raw.written || '') + chunk;
        raw.body = raw.written;
        return true;
    };
    raw.end = function (data) {
        raw.writableEnded = true;
        raw.body = data;
        raw.emit('finish');
    };
    return new Response(raw);
}

function mockContext() {
    return {
        RouteRegistry: new RouteRegistry(),
        MiddlewarePipeline: new MiddlewarePipeline()
    };
}

function withServer(handler) {
    const http = require('node:http');
    return new Promise((resolve, reject) => {
        const server = http.createServer(handler);
        server.listen(0, () => {
            const port = server.address().port;
            resolve({ server, port });
        });
    });
}

async function fetchFrom(port, path, options = {}) {
    const http = require('node:http');
    return new Promise((resolve, reject) => {
        const req = http.request({ port, path, method: options.method || 'GET', ...options }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ===================================================================
// RouteTrie
// ===================================================================

describe('RouteTrie', () => {

    it('matches static routes', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/users', 'handler1');
        trie.insert('GET', '/posts', 'handler2');

        assert.deepStrictEqual(trie.find('GET', '/users'), { handler: 'handler1', params: {} });
        assert.deepStrictEqual(trie.find('GET', '/posts'), { handler: 'handler2', params: {} });
    });

    it('returns null for unmatched routes', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/users', 'h');
        assert.strictEqual(trie.find('GET', '/posts'), null);
    });

    it('matches parameter routes and extracts params', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/users/:id', 'h');

        const result = trie.find('GET', '/users/42');
        assert.notStrictEqual(result, null);
        assert.strictEqual(result.handler, 'h');
        assert.deepStrictEqual(result.params, { id: '42' });
    });

    it('matches routes with multiple parameters', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/:a/:b', 'h');

        const result = trie.find('GET', '/foo/bar');
        assert.deepStrictEqual(result.params, { a: 'foo', b: 'bar' });
    });

    it('matches wildcard routes', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/files/*', 'h');

        const result = trie.find('GET', '/files/a/b/c.txt');
        assert.strictEqual(result.handler, 'h');
        assert.strictEqual(result.params['*'], 'a/b/c.txt');
    });

    it('applies precedence: static > param > wildcard', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/users/me', 'static');
        trie.insert('GET', '/users/:id', 'param');
        trie.insert('GET', '/users/*', 'wildcard');

        assert.strictEqual(trie.find('GET', '/users/me').handler, 'static');
        assert.strictEqual(trie.find('GET', '/users/42').handler, 'param');
        assert.strictEqual(trie.find('GET', '/users/a/b').handler, 'wildcard');
    });

    it('throws on duplicate routes', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/users', 'h');
        assert.throws(() => trie.insert('GET', '/users', 'h2'), /duplicate/i);
    });

    it('supports multiple HTTP methods independently', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/resource', 'getter');
        trie.insert('POST', '/resource', 'poster');

        assert.strictEqual(trie.find('GET', '/resource').handler, 'getter');
        assert.strictEqual(trie.find('POST', '/resource').handler, 'poster');
        assert.strictEqual(trie.find('PUT', '/resource'), null);
    });

    it('does not confuse param names across methods', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/:id', 'g');
        trie.insert('POST', '/:slug', 'p');

        assert.deepStrictEqual(trie.find('GET', '/abc').params, { id: 'abc' });
        assert.deepStrictEqual(trie.find('POST', '/abc').params, { slug: 'abc' });
    });

    it('returns null when method not registered', () => {
        const trie = new RouteTrie();
        trie.insert('GET', '/x', 'h');
        assert.strictEqual(trie.find('DELETE', '/x'), null);
    });
});

// ===================================================================
// RouteRegistry
// ===================================================================

describe('RouteRegistry', () => {
    it('registers and finds routes', () => {
        const reg = new RouteRegistry();
        reg.register('GET', '/hello', 'world');
        assert.deepStrictEqual(reg.find('GET', '/hello'), { handler: 'world', params: {} });
    });

    it('returns null for unknown routes', () => {
        const reg = new RouteRegistry();
        assert.strictEqual(reg.find('GET', '/nope'), null);
    });
});

// ===================================================================
// MiddlewarePipeline
// ===================================================================

describe('MiddlewarePipeline', () => {
    it('executes middleware in order', async () => {
        const order = [];
        const pipe = new MiddlewarePipeline();
        pipe.use((req, res, next) => { order.push(1); next(); });
        pipe.use((req, res, next) => { order.push(2); next(); });
        pipe.use((req, res, next) => { order.push(3); next(); });

        await pipe.execute({}, { writableEnded: false });
        assert.deepStrictEqual(order, [1, 2, 3]);
    });

    it('supports async middleware', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use(async (req, res, next) => {
            await new Promise(r => setTimeout(r, 10));
            req.val = 1;
            next();
        });

        const req = {};
        await pipe.execute(req, { writableEnded: false });
        assert.strictEqual(req.val, 1);
    });

    it('calls next callback when provided', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use((req, res, next) => next());

        let called = false;
        await pipe.execute({}, { writableEnded: false }, () => { called = true; });
        assert.strictEqual(called, true);
    });

    it('error middleware catches thrown errors', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use((req, res, next) => { throw new Error('boom'); });
        pipe.use((err, req, res, next) => {
            res.body = err.message;
            next();
        });

        const res = { writableEnded: false };
        await pipe.execute({}, res);
        assert.strictEqual(res.body, 'boom');
    });

    it('error middleware catches async errors', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use(async (req, res, next) => { throw new Error('async boom'); });
        pipe.use((err, req, res, next) => {
            res.body = err.message;
            next();
        });

        const res = { writableEnded: false };
        await pipe.execute({}, res);
        assert.strictEqual(res.body, 'async boom');
    });

    it('error middleware forwards to next error handler', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use((req, res, next) => { throw new Error('e1'); });
        pipe.use((err, req, res, next) => next(err));
        pipe.use((err, req, res, next) => { res.body = 'caught: ' + err.message; next(); });

        const res = { writableEnded: false };
        await pipe.execute({}, res);
        assert.strictEqual(res.body, 'caught: e1');
    });

    it('error middleware does not run for normal middleware', async () => {
        const pipe = new MiddlewarePipeline();
        pipe.use((req, res, next) => { res.body = 'ok'; next(); });
        pipe.use((err, req, res, next) => { res.body = 'err'; next(); });

        const res = { writableEnded: false };
        await pipe.execute({}, res);
        assert.strictEqual(res.body, 'ok');
    });

    it('throws for invalid middleware arity', () => {
        const pipe = new MiddlewarePipeline();
        assert.throws(() => pipe.use(() => {}), /middleware function should be/i);
    });
});

// ===================================================================
// RequestDispatcher
// ===================================================================

describe('RequestDispatcher', () => {
    it('dispatches to matching route handler', async () => {
        const ctx = mockContext();
        ctx.RouteRegistry.register('GET', '/hello', (req, res) => {
            res.end('world');
        });

        const req = mockReq({ url: '/hello' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.body, 'world');
    });

    it('extracts and attaches params to req', async () => {
        const ctx = mockContext();
        ctx.RouteRegistry.register('GET', '/users/:id', (req, res) => {
            res.end(req.params.id);
        });

        const req = mockReq({ url: '/users/99' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.body, '99');
    });

    it('returns 404 when no route matches', async () => {
        const ctx = mockContext();
        const req = mockReq({ url: '/nothing' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.body, 'Not Found');
    });

    it('runs middleware before route handler', async () => {
        const ctx = mockContext();
        ctx.MiddlewarePipeline.use((req, res, next) => { req.mw = 1; next(); });
        ctx.RouteRegistry.register('GET', '/', (req, res) => { res.end('' + req.mw); });

        const req = mockReq({ url: '/' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.body, '1');
    });

    it('skips handler if middleware ended the response', async () => {
        const ctx = mockContext();
        ctx.MiddlewarePipeline.use((req, res, next) => { res.end('from mw'); });
        ctx.RouteRegistry.register('GET', '/', () => { throw new Error('should not run'); });

        const req = mockReq({ url: '/' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.body, 'from mw');
    });

    it('normalizes URL before matching', async () => {
        const ctx = mockContext();
        ctx.RouteRegistry.register('GET', '/hello', (req, res) => { res.end('ok'); });

        const req = mockReq({ url: '//hello//' });
        const res = mockRes();
        await new RequestDispatcher().dispatch(req, res, ctx);

        assert.strictEqual(res.body, 'ok');
    });
});

// ===================================================================
// Router (Public API)
// ===================================================================

describe('Router', () => {
    it('registers routes via get/post/put/patch/delete', () => {
        const app = new Router();
        const handler = () => {};
        app.get('/a', handler);
        app.post('/b', handler);
        app.put('/c', handler);
        app.patch('/d', handler);
        app.delete('/e', handler);
    });

    it('handles requests end-to-end', async () => {
        const app = new Router();
        app.get('/ping', (req, res) => res.end('pong'));

        const req = mockReq({ url: '/ping' });
        const res = mockRes();
        await app.handle(req, res);

        assert.strictEqual(res.body, 'pong');
    });

    it('runs middleware registered with use()', async () => {
        const app = new Router();
        app.use((req, res, next) => { req.touched = true; next(); });
        app.get('/x', (req, res) => res.end('' + req.touched));

        const req = mockReq({ url: '/x' });
        const res = mockRes();
        await app.handle(req, res);

        assert.strictEqual(res.body, 'true');
    });

    it('404 when no route matches', async () => {
        const app = new Router();
        const req = mockReq({ url: '/missing' });
        const res = mockRes();
        await app.handle(req, res);

        assert.strictEqual(res.statusCode, 404);
    });
});

// ===================================================================
// normalizeUrl
// ===================================================================

describe('normalizeUrl', () => {
    it('parses query string into req.query', () => {
        const req = { url: '/search?q=hello&page=1' };
        normalizeUrl(req);
        assert.deepStrictEqual(req.query, { q: 'hello', page: '1' });
    });

    it('removes hash fragment', () => {
        const req = { url: '/page#section' };
        normalizeUrl(req);
        assert.strictEqual(req.url, '/page');
    });

    it('strips trailing slash (except root)', () => {
        const req = { url: '/users/' };
        normalizeUrl(req);
        assert.strictEqual(req.url, '/users');
    });

    it('preserves root slash', () => {
        const req = { url: '/' };
        normalizeUrl(req);
        assert.strictEqual(req.url, '/');
    });

    it('collapses duplicate slashes', () => {
        const req = { url: '//a//b' };
        normalizeUrl(req);
        assert.strictEqual(req.url, '/a/b');
    });

    it('adds leading slash if missing', () => {
        const req = { url: 'users' };
        normalizeUrl(req);
        assert.strictEqual(req.url, '/users');
    });

    it('saves original URL in req.originalUrl', () => {
        const req = { url: '/ORIGINAL?x=1' };
        normalizeUrl(req);
        assert.strictEqual(req.originalUrl, '/ORIGINAL?x=1');
    });
});

// ===================================================================
// MIME
// ===================================================================

describe('MIME', () => {
    it('returns correct type for known extensions', () => {
        assert.strictEqual(MIME.getType('file.html'), 'text/html');
        assert.strictEqual(MIME.getType('file.css'), 'text/css');
        assert.strictEqual(MIME.getType('file.js'), 'application/javascript');
        assert.strictEqual(MIME.getType('file.json'), 'application/json');
        assert.strictEqual(MIME.getType('file.png'), 'image/png');
        assert.strictEqual(MIME.getType('file.pdf'), 'application/pdf');
    });

    it('returns octet-stream for unknown extensions', () => {
        assert.strictEqual(MIME.getType('file.xyz'), 'application/octet-stream');
    });

    it('is case-insensitive', () => {
        assert.strictEqual(MIME.getType('file.HTML'), 'text/html');
    });
});

// ===================================================================
// Middleware: bodyParser
// ===================================================================

describe('bodyParser', () => {
    it('parses JSON bodies', async () => {
        const parser = bodyParser();
        const req = mockReq({
            method: 'POST',
            headers: { 'content-type': 'application/json' }
        });
        const res = mockRes();

        process.nextTick(() => {
            req.emit('data', Buffer.from('{"a":1}'));
            req.emit('end');
        });

        await new Promise(resolve => parser(req, res, resolve));
        assert.deepStrictEqual(req.body, { a: 1 });
    });

    it('parses urlencoded bodies', async () => {
        const parser = bodyParser();
        const req = mockReq({
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' }
        });
        const res = mockRes();

        process.nextTick(() => {
            req.emit('data', Buffer.from('x=1&y=2'));
            req.emit('end');
        });

        await new Promise(resolve => parser(req, res, resolve));
        assert.deepStrictEqual(req.body, { x: '1', y: '2' });
    });

    it('parses plain text bodies', async () => {
        const parser = bodyParser();
        const req = mockReq({
            method: 'POST',
            headers: { 'content-type': 'text/plain' }
        });
        const res = mockRes();

        process.nextTick(() => {
            req.emit('data', Buffer.from('raw text'));
            req.emit('end');
        });

        await new Promise(resolve => parser(req, res, resolve));
        assert.strictEqual(req.body, 'raw text');
    });

    it('sets empty object for empty body', async () => {
        const parser = bodyParser();
        const req = mockReq({ method: 'POST', headers: {} });
        const res = mockRes();

        process.nextTick(() => {
            req.emit('end');
        });

        await new Promise(resolve => parser(req, res, resolve));
        assert.deepStrictEqual(req.body, {});
    });

    it('calls next with error on malformed JSON', async () => {
        const parser = bodyParser();
        const req = mockReq({
            method: 'POST',
            headers: { 'content-type': 'application/json' }
        });
        const res = mockRes();

        process.nextTick(() => {
            req.emit('data', Buffer.from('not json'));
            req.emit('end');
        });

        const err = await new Promise(resolve => parser(req, res, resolve));
        assert.ok(err instanceof SyntaxError);
    });

    it('handles req error event', async () => {
        const parser = bodyParser();
        const req = mockReq({ method: 'POST', headers: {} });
        const res = mockRes();
        const err = new Error('stream error');

        const errReceived = await new Promise(resolve => {
            parser(req, res, (e) => resolve(e));
            req.emit('error', err);
        });

        assert.strictEqual(errReceived, err);
    });
});

// ===================================================================
// Middleware: logger
// ===================================================================

describe('logger', () => {
    it('calls next and logs on finish', async () => {
        const logs = [];
        mock.method(console, 'log', (msg) => logs.push(msg));

        const mw = logger();
        const req = mockReq({ url: '/test' });
        req.originalUrl = '/test';
        const res = mockRes();

        let nextCalled = false;
        await mw(req, res, () => { nextCalled = true; });
        res.emit('finish');

        assert.strictEqual(nextCalled, true);
        assert.ok(logs.length > 0);
        assert.ok(logs[0].includes('GET'));
        assert.ok(logs[0].includes('/test'));
    });
});

// ===================================================================
// Middleware: cors
// ===================================================================

describe('cors', () => {
    it('sets default CORS headers', () => {
        const mw = cors();
        const req = mockReq({ headers: { origin: 'http://example.com' } });
        const res = mockRes();

        mw(req, res, () => {});
        assert.strictEqual(res.get('Access-Control-Allow-Origin'), '*');
        assert.ok(res.get('Access-Control-Allow-Methods'));
    });

    it('restricts to specific origin', () => {
        const mw = cors({ origin: 'http://app.com' });
        const req = mockReq({ headers: { origin: 'http://other.com' } });
        const res = mockRes();

        mw(req, res, () => {});
        assert.strictEqual(res.get('Access-Control-Allow-Origin'), 'http://app.com');
    });

    it('handles preflight OPTIONS request', () => {
        const mw = cors();
        const req = mockReq({ method: 'OPTIONS', headers: {} });
        const res = mockRes();

        mw(req, res, () => {});
        assert.strictEqual(res.statusCode, 204);
        assert.strictEqual(res.writableEnded, true);
    });
});

// ===================================================================
// Middleware: injectScript
// ===================================================================

describe('injectScript', () => {
    it('injects script into HTML response before </body>', () => {
        const mw = injectScript('alert("hi")');
        const req = mockReq();
        const res = mockRes();
        res.set('Content-Type', 'text/html');

        mw(req, res, () => {
            res.end('<html><body></body></html>');
        });

        assert.strictEqual(res.body, '<html><body><script>alert("hi")</script></body></html>');
    });

    it('does not modify non-HTML responses', () => {
        const mw = injectScript('alert(1)');
        const req = mockReq();
        const res = mockRes();
        res.set('Content-Type', 'application/json');

        mw(req, res, () => {
            res.end('{"ok":true}');
        });

        assert.strictEqual(res.body, '{"ok":true}');
    });
});

// ===================================================================
// Middleware: directory
// ===================================================================

describe('directory', () => {
    it('generates directory listing HTML', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        fs.writeFileSync(path.join(dir, 'a.txt'), 'a');
        fs.mkdirSync(path.join(dir, 'sub'));

        const mw = directory(dir, { icons: false });
        const req = mockReq({ url: '/' });
        const res = mockRes();

        await mw(req, res, () => {});

        assert.ok(res.body.includes('Index of'));
        assert.ok(res.body.includes('a.txt'));
        assert.ok(res.body.includes('sub'));
        assert.strictEqual(res.get('Content-Type'), 'text/html; charset=utf-8');

        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('calls next for non-directory paths', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        fs.writeFileSync(path.join(dir, 'f.txt'), 'x');

        const mw = directory(dir);
        const req = mockReq({ url: '/f.txt' });
        const res = mockRes();

        let called = false;
        await mw(req, res, () => { called = true; });
        assert.strictEqual(called, true);

        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('falls through when directory does not exist', async () => {
        const mw = directory('C:\\nonexistent-router-test-dir-12345');
        const req = mockReq({ url: '/' });
        const res = mockRes();

        let called = false;
        await mw(req, res, () => { called = true; });
        assert.strictEqual(called, true);
    });

    it('serves index.html when present', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        fs.writeFileSync(path.join(dir, 'index.html'), '<h1>Hello</h1>');

        const mw = directory(dir);
        const req = mockReq({ url: '/' });
        const res = mockRes();

        let called = false;
        const next = () => { called = true; };
        await mw(req, res, next);

        assert.strictEqual(called, false);

        fs.rmSync(dir, { recursive: true, force: true });
    });
});

// ===================================================================
// Middleware: watch
// ===================================================================

describe('watch', () => {
    it('passes through for non-livereload URL', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        const w = watch(dir);
        const req = mockReq({ url: '/something' });
        const res = mockRes();

        let called = false;
        await w.middleware(req, res, () => { called = true; });
        assert.strictEqual(called, true);

        w.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('responds with SSE for live reload endpoint', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        const w = watch(dir);
        const req = mockReq({ url: '/__live_reload' });
        const res = mockRes();

        await w.middleware(req, res, () => {});
        assert.strictEqual(res.get('Content-Type'), 'text/event-stream');
        assert.strictEqual(res.writableEnded, false);

        w.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });

    // Skipped on win32: libuv's recursive fs.watch hard-aborts the process
    // (uncatchable) when an entry changes inside a watched directory
    // (nodejs/libuv Windows bug, src\win\fs-event.c).
    if (process.platform !== 'win32') {
        it('broadcasts reload events to connected clients', async () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
            const w = watch(dir);
            const req = mockReq({ url: '/__live_reload' });
            const res = mockRes();

            await w.middleware(req, res, () => {});

            const file = path.join(dir, 'file.txt');
            fs.writeFileSync(file, 'hello');
            fs.appendFileSync(file, ' world');

            const deadline = Date.now() + 2000;
            while (!res.body && Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 10));
            }

            assert.ok(res.body, 'expected a reload event');
            assert.ok(res.body.includes('data: reload'));

            w.close();
            fs.rmSync(dir, { recursive: true, force: true });
        });
    }

    it('close() ends connected clients and stops the watcher', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
        const w = watch(dir);
        const req = mockReq({ url: '/__live_reload' });
        const res = mockRes();

        await w.middleware(req, res, () => {});
        w.close();

        assert.strictEqual(res.writableEnded, true);

        fs.rmSync(dir, { recursive: true, force: true });
    });
});

// ===================================================================
// Integration: end-to-end with HTTP server
// ===================================================================

describe('Integration', () => {
    it('handles GET requests end-to-end', async () => {
        const app = new Router();
        app.get('/hello', (req, res) => {
            res.end('world');
        });

        const { server, port } = await withServer((req, res) => app.handle(req, res));
        try {
            const result = await fetchFrom(port, '/hello');
            assert.strictEqual(result.statusCode, 200);
            assert.strictEqual(result.body, 'world');
        } finally {
            server.close();
        }
    });

    it('returns 404 for unmatched routes', async () => {
        const app = new Router();
        app.get('/exists', (req, res) => res.end('ok'));

        const { server, port } = await withServer((req, res) => app.handle(req, res));
        try {
            const result = await fetchFrom(port, '/missing');
            assert.strictEqual(result.statusCode, 404);
        } finally {
            server.close();
        }
    });

    it('runs middleware + handler in integration', async () => {
        const app = new Router();
        app.use(bodyParser());
        app.post('/data', (req, res) => {
            res.end(JSON.stringify(req.body));
        });

        const { server, port } = await withServer((req, res) => app.handle(req, res));
        try {
            const result = await fetchFrom(port, '/data', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ x: 1 })
            });
            assert.strictEqual(result.statusCode, 200);
            assert.strictEqual(result.body, '{"x":1}');
        } finally {
            server.close();
        }
    });

    it('CORS middleware works in integration', async () => {
        const app = new Router();
        app.use(cors());
        app.get('/cors-test', (req, res) => res.end('ok'));

        const { server, port } = await withServer((req, res) => app.handle(req, res));
        try {
            const result = await fetchFrom(port, '/cors-test', {
                headers: { origin: 'http://example.com' }
            });
            assert.strictEqual(result.headers['access-control-allow-origin'], '*');
            assert.strictEqual(result.body, 'ok');
        } finally {
            server.close();
        }
    });
});
