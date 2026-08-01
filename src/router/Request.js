const TYPE_ALIASES = {
    html: 'text/html',
    json: 'application/json',
    js: 'application/javascript',
    text: 'text/plain',
    xml: 'application/xml',
    pdf: 'application/pdf'
};

class Request {
    // Raw Node request
    raw;

    // HTTP
    method;
    url;
    path;
    originalUrl;
    protocol;
    hostname;
    ip;
    headers;
    
    // Parsed data
    query = {};
    params = {};
    body = null;
    cookies = {};

    // Static middleware context
    context = {
        file: null,
        stream: null,
        range: null
    };

    // Shared storage
    locals = {};

    constructor(req) {
        this.raw = req;

        this.method = req.method ?? 'GET';
        this.url = req.url ?? '/';
        this.path = req.path ?? null;
        this.originalUrl = req.originalUrl ?? null;
        this.headers = req.headers ?? {};

        const socket = req.socket ?? {};

        this.protocol = socket.encrypted ? 'https' : 'http';
        this.hostname = (this.headers.host ?? '').split(':')[0] || null;
        this.ip = socket.remoteAddress ?? null;
    }

    get(name) {
        return this.headers[String(name).toLowerCase()];
    }

    header(name) {
        return this.get(name);
    }

    accepts(type) {
        const accept = this.get('accept');

        if (!accept)
            return true;

        const requested = String(type)
            .split(',')
            .map(t => TYPE_ALIASES[t.trim().toLowerCase()] ?? t.trim().toLowerCase())
            .filter(Boolean);

        const accepted = accept
            .split(',')
            .map(part => {
                const [mime, ...params] = part.trim().split(';');

                const quality = params.reduce((best, param) => {
                    const [key, value] = param.trim().split('=');
                    return key === 'q' ? Number(value) : best;
                }, 1);

                return { mime: mime.toLowerCase(), quality };
            })
            .sort((a, b) => b.quality - a.quality);

        for (const candidate of requested) {
            if (accepted.some(({ mime }) =>
                mime === candidate ||
                mime === candidate.split('/')[0] + '/*'
            )) {
                return candidate;
            }
        }

        return false;
    }

    is(type) {
        const expected = TYPE_ALIASES[String(type).toLowerCase()]
            ?? String(type).toLowerCase();

        const contentType = (this.get('content-type') ?? '')
            .split(';')[0]
            .trim()
            .toLowerCase();

        if (contentType === expected)
            return true;

        if (expected.endsWith('/*'))
            return contentType.split('/')[0] === expected.split('/')[0];

        return false;
    }

    param(name) {
        if (this.params && name in this.params)
            return this.params[name];

        if (this.body && typeof this.body === 'object' && name in this.body)
            return this.body[name];

        if (name in this.query)
            return this.query[name];

        return undefined;
    }

    secure() {
        return this.protocol === 'https';
    }

    xhr() {
        return (this.get('x-requested-with') ?? '')
            .toLowerCase() === 'xmlhttprequest';
    }

    on(event, listener) {
        this.raw.on(event, listener);
        return this;
    }

    once(event, listener) {
        this.raw.once(event, listener);
        return this;
    }

    emit(event, ...args) {
        return this.raw.emit(event, ...args);
    }
}

module.exports = Request;
