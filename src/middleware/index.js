const bodyParser = require('./bodyParser');
const logger = require('./logger');
const injectScript = require('./injectScript');
const watch = require('./watch');
const static = require('./static');

module.exports = {
    bodyParser,
    logger,
    injectScript,
    watch,
    static
};