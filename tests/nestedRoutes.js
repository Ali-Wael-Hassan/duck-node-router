const { describe, it } = require('node:test');
const assert = require('node:assert');

const Router = require('../src/router');
const { Request, Response } = Router;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockReq({ method = 'GET', url = '/', headers = {} } = {}) {
    const raw = {};
    raw.method = method;
    raw.url = url;
    raw.headers = headers;
    return new Request(raw);
}

function mockRes() {
    return new Response({
        statusCode: 200,
        headers: {},
        writableEnded: false,
        writable: true,
        setHeader(k, v) { this.headers[k] = v; },
        getHeader(k) { return this.headers[k]; },
        hasHeader(k) { return k in this.headers; },
        removeHeader(k) { delete this.headers[k]; },
        end(data) {
            this.writableEnded = true;
            this.body = data;
        }
    });
}

async function get(app, url, method = 'GET') {
    const req = mockReq({ url, method });
    const res = mockRes();
    await app.handle(req, res);
    return { req, res };
}

// ===================================================================
// Nested Routes
// ===================================================================

describe('Nested Routes (only nested)', () => {
    it('routes into a nested router and strips the mount prefix', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('users'));
        api.get('/users/:id', (req, res) => res.end('user ' + req.params.id));

        const app = new Router();
        app.get('/api', api);

        const { res: users } = await get(app, '/api/users');
        assert.strictEqual(users.statusCode, 200);
        assert.strictEqual(users.body, 'users');

        const { res: one } = await get(app, '/api/users/42');
        assert.strictEqual(one.statusCode, 200);
        assert.strictEqual(one.body, 'user 42');
    });

    it('routes the bare mount path to the nested root', async () => {
        const api = new Router();
        api.get('/', (req, res) => res.end('api root'));

        const app = new Router();
        app.get('/api', api);

        const { res } = await get(app, '/api');
        assert.strictEqual(res.body, 'api root');
    });

    it('returns 404 when the nested router has no match', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('users'));

        const app = new Router();
        app.get('/api', api);

        const { res } = await get(app, '/api/nope');
        assert.strictEqual(res.statusCode, 404);
    });

    it('supports all HTTP methods in nested routers', async () => {
        const api = new Router();
        api.get('/x', (req, res) => res.end('g'));
        api.post('/x', (req, res) => res.end('p'));
        api.put('/x', (req, res) => res.end('u'));
        api.patch('/x', (req, res) => res.end('pa'));
        api.delete('/x', (req, res) => res.end('d'));

        const app = new Router();
        app.get('/api', api);
        app.post('/api', api);
        app.put('/api', api);
        app.patch('/api', api);
        app.delete('/api', api);

        assert.strictEqual((await get(app, '/api/x')).res.body, 'g');
        assert.strictEqual((await get(app, '/api/x', 'POST')).res.body, 'p');
        assert.strictEqual((await get(app, '/api/x', 'PUT')).res.body, 'u');
        assert.strictEqual((await get(app, '/api/x', 'PATCH')).res.body, 'pa');
        assert.strictEqual((await get(app, '/api/x', 'DELETE')).res.body, 'd');
    });

    it('preserves the outer mount path during nested dispatch', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('url=' + req.url));

        const app = new Router();
        app.get('/api', api);

        const { res } = await get(app, '/api/users');
        assert.strictEqual(res.body, 'url=/users');
    });

    it('merges query strings into the nested request', async () => {
        const api = new Router();
        api.get('/search', (req, res) => res.end(JSON.stringify(req.query)));

        const app = new Router();
        app.get('/api', api);

        const { res } = await get(app, '/api/search?q=hello&page=2');
        assert.strictEqual(res.body, JSON.stringify({ q: 'hello', page: '2' }));
    });

    it('runs nested middleware before nested handlers', async () => {
        const api = new Router();
        api.use((req, res, next) => { req.nested = 1; next(); });
        api.get('/users', (req, res) => res.end('' + req.nested));

        const app = new Router();
        app.get('/api', api);

        const { res } = await get(app, '/api/users');
        assert.strictEqual(res.body, '1');
    });

    it('supports mounting a nested router via the callable directly', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('users'));

        const app = new Router();
        app.get('/api', api);

        const req = mockReq({ url: '/api/users' });
        const res = mockRes();
        await app(req, res);

        assert.strictEqual(res.body, 'users');
    });
});

describe('Nested Routes (nested + normal)', () => {
    it('dispatches nested and normal routes together', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('users'));

        const app = new Router();
        app.get('/api', api);
        app.get('/health', (req, res) => res.end('ok'));
        app.get('/admin/:id', (req, res) => res.end('direct ' + req.params.id));

        const { res: users } = await get(app, '/api/users');
        assert.strictEqual(users.body, 'users');

        const { res: health } = await get(app, '/health');
        assert.strictEqual(health.body, 'ok');

        const { res: direct } = await get(app, '/admin/42');
        assert.strictEqual(direct.body, 'direct 42');
    });

    it('keeps static outer routes winning over nested mounts', async () => {
        const api = new Router();
        api.get('/version', (req, res) => res.end('nested'));

        const app = new Router();
        app.get('/api', api);
        app.get('/api/version', (req, res) => res.end('outer'));

        const { res } = await get(app, '/api/version');
        assert.strictEqual(res.body, 'outer');
    });

    it('runs outer middleware before nested dispatch', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('' + req.outer));

        const app = new Router();
        app.use((req, res, next) => { req.outer = 'set'; next(); });
        app.get('/api', api);

        const { res } = await get(app, '/api/users');
        assert.strictEqual(res.body, 'set');
    });

    it('keeps outer 404s separate from nested 404s', async () => {
        const api = new Router();
        api.get('/users', (req, res) => res.end('users'));

        const app = new Router();
        app.get('/api', api);
        app.get('/health', (req, res) => res.end('ok'));

        const { res: missing } = await get(app, '/nonexistent');
        assert.strictEqual(missing.statusCode, 404);

        const { res: nestedMissing } = await get(app, '/api/nonexistent');
        assert.strictEqual(nestedMissing.statusCode, 404);
    });

    it('supports two nested routers mounted side by side', async () => {
        const api = new Router();
        api.get('/x', (req, res) => res.end('api'));
        const web = new Router();
        web.get('/y', (req, res) => res.end('web'));

        const app = new Router();
        app.get('/api', api);
        app.get('/web', web);

        assert.strictEqual((await get(app, '/api/x')).res.body, 'api');
        assert.strictEqual((await get(app, '/web/y')).res.body, 'web');
        assert.strictEqual((await get(app, '/web/x')).res.statusCode, 404);
    });

    it('supports nesting a router inside another router', async () => {
        const inner = new Router();
        inner.get('/deep', (req, res) => res.end('deep'));

        const mid = new Router();
        mid.get('/sub', inner);

        const app = new Router();
        app.get('/api', mid);

        const { res } = await get(app, '/api/sub/deep');
        assert.strictEqual(res.body, 'deep');
    });
});
