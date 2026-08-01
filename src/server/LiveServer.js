const http = require('http');

const Router = require('../router');
const {
    static: serveStatic,
    directory,
    logger,
    cors,
    watch,
    injectScript
} = require('../middleware');

const liveReloadClient = require('./liveReloadClient');

class LiveServer {
    #router;
    #watcher;

    constructor(options = {}) {
        const {
            root = '.',

            directoryListing = true,

            cors: corsOptions = false,

            cache = {},
            compression = {},

            liveReload = true,
            inject = true
        } = options;


        this.#router = new Router();

        this.#router.use(logger());

        if (corsOptions !== false)
            this.#router.use(cors(corsOptions));

        if (liveReload) {
            this.#watcher = watch(root);
            this.#router.use(this.#watcher.middleware);
        }

        if (inject)
            this.#router.use(
                injectScript(liveReloadClient)
            );

        if (directoryListing)
            this.#router.use(
                directory(root)
            );

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
                console.log(
                    `Live Server running at http://localhost:${port}`
                )
            )
        );

        return server;
    }

    close() {
        this.#watcher?.close();
    }
}


module.exports = LiveServer;