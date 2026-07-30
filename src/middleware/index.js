const bodyParser = require('./bodyParser');
const logger = require('./logger');
const injectScript = require('./injectScript');
const watch = require('./watch');
const static = require('./static');
const directory = require('./directory');
const cors = require('./cors');

module.exports = {
    bodyParser,
    logger,
    injectScript,
    watch,
    static,
    directory,
    cors
};