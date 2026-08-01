const injectScript = (script) => {
    return (req, res, next) => {
        const end = res.end;

        res.end = function (data, encoding, callback) {
            const type = res.get("Content-Type");

            if (typeof data === 'string' && type?.startsWith("text/html")) {
                data = data.replace('</body>', `<script>${script}</script></body>`);
            }

            return end.call(this, data, encoding, callback);
        };

        next();
    };
};

module.exports = injectScript;