const { MIME } = require('../utils');

class Response {
    // Raw Node response
    raw;

    // Last body sent (for inspection / debugging)
    body = null;

    // Shared storage
    locals = {};

    constructor(res) {
        this.raw = res;
    }

    get statusCode() {
        return this.raw.statusCode ?? 200;
    }

    set statusCode(code) {
        this.raw.statusCode = code;
    }

    status(code) {
        this.statusCode = code;
        return this;
    }

    set(name, value) {
        if (typeof name === 'string') {
            this.raw.setHeader(name, value);
        } else {
            for (const [key, val] of Object.entries(name)) {
                this.raw.setHeader(key, val);
            }
        }
        return this;
    }

    get(name) {
        return this.raw.getHeader(name);
    }

    has(name) {
        return this.raw.hasHeader
            ? this.raw.hasHeader(name)
            : this.raw.getHeader(name) !== undefined;
    }

    remove(name) {
        this.raw.removeHeader(name);
        return this;
    }

    type(type) {
        const mime = String(type).includes('/')
            ? type
            : MIME.getType(type);

        return this.set('Content-Type', mime);
    }

    send(body) {
        let data = body;

        if (body === undefined || body === null) {
            data = '';
        } else if (typeof body === 'object' && !Buffer.isBuffer(body)) {
            return this.json(body);
        }

        if (typeof data === 'string' || Buffer.isBuffer(data)) {
            if (!this.has('Content-Type')) {
                this.set(
                    'Content-Type',
                    typeof data === 'string'
                        ? 'text/html; charset=utf-8'
                        : 'application/octet-stream'
                );
            }
        } else {
            data = String(data);

            if (!this.has('Content-Type'))
                this.set('Content-Type', 'text/html; charset=utf-8');
        }

        if (!this.has('Content-Length'))
            this.set('Content-Length', Buffer.byteLength(data));

        return this.end(data);
    }

    json(obj) {
        const body = obj === undefined ? '' : JSON.stringify(obj);

        if (!this.has('Content-Type'))
            this.set('Content-Type', 'application/json; charset=utf-8');

        this.set('Content-Length', Buffer.byteLength(body));

        return this.end(body);
    }

    html(html) {
        return this
            .set('Content-Type', 'text/html; charset=utf-8')
            .end(html);
    }

    redirect(url, status = 302) {
        return this
            .status(status)
            .set('Location', url)
            .end();
    }

    download(path) {
        const { basename } = require('node:path');

        return this
            .attachment(basename(path))
            .sendFile(path);
    }

    sendFile(path) {
        const fs = require('node:fs');

        this.set('Content-Type', MIME.getType(path));

        if (!this.has('Content-Length')) {
            const stat = fs.statSync(path);
            this.set('Content-Length', stat.size);
        }

        const stream = fs.createReadStream(path);

        stream.on('error', (err) => {
            this.raw.destroy?.(err);
        });

        stream.pipe(this);

        return this;
    }

    attachment(filename) {
        const { basename } = require('node:path');

        return this.set(
            'Content-Disposition',
            `attachment; filename="${basename(String(filename))}"`
        );
    }

    cookie(name, value, options = {}) {
        const opts = { ...options };

        if (opts.maxAge !== undefined) {
            opts.expires = new Date(Date.now() + opts.maxAge);
            delete opts.maxAge;
        }

        let cookie = `${name}=${encodeURIComponent(value)}`;

        if (opts.expires)
            cookie += `; Expires=${opts.expires.toUTCString()}`;
        if (opts.path)
            cookie += `; Path=${opts.path}`;
        if (opts.domain)
            cookie += `; Domain=${opts.domain}`;
        if (opts.secure)
            cookie += `; Secure`;
        if (opts.httpOnly)
            cookie += `; HttpOnly`;
        if (opts.sameSite)
            cookie += `; SameSite=${opts.sameSite}`;

        const existing = this.get('Set-Cookie');
        const cookies = existing
            ? (Array.isArray(existing) ? existing : [existing])
            : [];

        cookies.push(cookie);

        return this.set('Set-Cookie', cookies);
    }

    clearCookie(name) {
        return this.cookie(name, '', {
            expires: new Date(0),
            path: '/'
        });
    }

    end(data, encoding, callback) {
        this.body = data;
        this.raw.end(data, encoding, callback);
        return this;
    }

    // ------------------------------------------------------------------
    // Node passthrough (stream / event compatibility)
    // ------------------------------------------------------------------

    write(chunk, encoding, callback) {
        return this.raw.write(chunk, encoding, callback);
    }

    writeHead(statusCode, statusMessage, headers) {
        if (typeof statusMessage === 'object') {
            headers = statusMessage;
            statusMessage = undefined;
        }

        if (headers)
            return this.raw.writeHead(statusCode, headers);

        return this.raw.writeHead(statusCode, statusMessage);
    }

    on(event, listener) {
        this.raw.on(event, listener);
        return this;
    }

    once(event, listener) {
        this.raw.once(event, listener);
        return this;
    }

    removeListener(event, listener) {
        this.raw.removeListener(event, listener);
        return this;
    }

    emit(event, ...args) {
        return this.raw.emit(event, ...args);
    }

    destroy(error) {
        this.raw.destroy?.(error);
        return this;
    }

    get writable() {
        return this.raw.writable;
    }

    get writableEnded() {
        return this.raw.writableEnded;
    }

    get destroyed() {
        return this.raw.destroyed;
    }

    get _writableState() {
        return this.raw._writableState;
    }
}

module.exports = Response;
