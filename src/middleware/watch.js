const fs = require('fs');

const watch = (directory) => {
    const clients = new Set();

    const watcher = fs.watch(directory, { recursive: true }, () => {
        for (const client of clients) {
            client.write('data: reload\n\n');
        }
    });

    return {
        middleware(req, res, next) {
            if (req.url !== "/__live_reload") {
                return next();
            }

            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            });

            clients.add(res);

            req.on("close", () => {
                clients.delete(res);
            });
        },

        close() {
            watcher.close();

            for (const client of clients) {
                client.end();
            }

            clients.clear();
        }
    };
};

module.exports = watch;