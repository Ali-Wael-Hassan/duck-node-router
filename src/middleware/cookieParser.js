const cookieParser = (cookieHeader = null) => (req, res, next) => {
    const header = cookieHeader ?? req.get('cookie') ?? '';

    req.cookies = header
        .split(';')
        .filter(Boolean)
        .reduce((cookies, cookie) => {
            const index = cookie.indexOf('=');

            if (index === -1)
                return cookies;

            cookies[
                decodeURIComponent(cookie.slice(0, index).trim())
            ] = decodeURIComponent(cookie.slice(index + 1).trim());

            return cookies;
        }, {});

    next();
};

module.exports = cookieParser;