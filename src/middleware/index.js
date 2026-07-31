const bodyParser = require('./bodyParser');
const logger = require('./logger');
const injectScript = require('./injectScript');
const watch = require('./watch');
const static = require('./static');
const directory = require('./directory');
const cors = require('./cors');
const resolve = require('./resolve');
const send = require('./send');
const stream = require('./stream');
const cache = require('./cache');
const compress = require('./compress');

module.exports = {
    bodyParser,
    logger,
    injectScript,
    watch,
    static,
    directory,
    cors,
    resolve,
    send,
    stream,
    cache,
    compress
};