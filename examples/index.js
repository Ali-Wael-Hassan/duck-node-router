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
    console.log('');
    console.log('  Try these routes:');
    console.log(`    curl http://localhost:${PORT}/`);
    console.log(`    curl http://localhost:${PORT}/users`);
    console.log(`    curl http://localhost:${PORT}/users/42`);
    console.log(`    curl http://localhost:${PORT}/users/42 -X DELETE`);
    console.log(`    curl http://localhost:${PORT}/search?q=router&page=1`);
    console.log(`    curl http://localhost:${PORT}/files/src/index.js`);
    console.log(`    curl http://localhost:${PORT}/users -X POST -H 'Content-Type: application/json' -d '{"name":"Charlie"}'`);
    console.log(`    curl http://localhost:${PORT}/users/7 -X PUT -H 'Content-Type: application/json' -d '{"name":"Diana"}'`);
    console.log('');
});
