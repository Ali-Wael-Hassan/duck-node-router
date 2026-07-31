const http = require('http');

const Router = require('../router');
const {
    static: serveStatic,
    directory,
    logger,
    cors
} = require('../middleware');

class StaticServer {
    #router;

    constructor(options = {}) {
        const {
            root = '.',
            directoryListing = false,
            cors: corsOptions = false,
            cache = {},
            compression = {}
        } = options;

        this.#router = new Router();

        this.#router.use(logger());

        if (corsOptions !== false)
            this.#router.use(cors(corsOptions));

        if (directoryListing)
            this.#router.use(directory(root));

        this.#router.use(
            serveStatic(root, {
                cache,
                compression
            })
        );
    }

    listen(port = 3000, callback = null) {
        const server = http.createServer(async (req, res) => {
            await this.#router.handle(req, res);
        });

        server.listen(
            port,
            callback ?? (() =>
                console.log(`Server running at http://localhost:${port}`)
            )
        );

        return server;
    }
}

module.exports = StaticServer;