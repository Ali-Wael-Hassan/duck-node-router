const fs = require("fs/promises");
const path = require("path");

const DEFAULT_CSS = `
body {
    font-family: system-ui, sans-serif;
    max-width: 900px;
    margin: 40px auto;
    padding: 0 20px;
    background: #fff;
    color: #222;
}

h1 {
    margin-bottom: 20px;
}

ul {
    list-style: none;
    padding: 0;
}

li {
    margin: 8px 0;
}

a {
    color: #2563eb;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
`;

const directory = (root, options = {}) => {
    const {
        icons = true,
        hidden = false,
        sort = "name",
        css = DEFAULT_CSS,
        index = true
    } = options;

    return async (req, res, next) => {
        try {
            const requestPath = req.path ?? req.url;
            const fullPath = path.join(root, requestPath);

            const stats = await fs.stat(fullPath);

            if (!stats.isDirectory()) {
                return next();
            }

            if (index) {
                const indexPath = path.join(fullPath, "index.html");
                try {
                    await fs.access(indexPath);

                    req.path = path.posix.join(req.path, "index.html");
                    req.url = req.path;
                    
                    return next();
                } catch {}
            }

            let entries = await fs.readdir(fullPath, {
                withFileTypes: true
            });

            if (!hidden) {
                entries = entries.filter(entry => !entry.name.startsWith("."));
            }

            switch (sort) {
                case "name":
                    entries.sort((a, b) => a.name.localeCompare(b.name));
                    break;

                default:
                    break;
            }

            const body = entries.map(entry => {
                const href = path.posix.join(requestPath, entry.name);

                const icon = icons
                    ? entry.isDirectory()
                        ? "📁 "
                        : "📄 "
                    : "";

                return `
<li>
    <a href="${href}">
        ${icon}${entry.name}
    </a>
</li>`;
            }).join("");

            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Index of ${requestPath}</title>
    <style>
${css}
    </style>
</head>
<body>

<h1>Index of ${requestPath}</h1>

<ul>
${body}
</ul>

</body>
</html>`;

            res
                .status(200)
                .set("Content-Type", "text/html; charset=utf-8")
                .end(html);
        } catch {
            next();
        }
    };
};

module.exports = directory;