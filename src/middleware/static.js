const MiddlewarePipeline = require('../router/MiddlewarePipeline');

const resolve = require('./resolve');
const cache = require('./cache');
const stream = require('./stream');
const compress = require('./compress');
const send = require('./send');

const static = (root, options = {}) => {
    const pipeline = new MiddlewarePipeline();

    pipeline.use(resolve(root));
    pipeline.use(cache(options.cache));
    pipeline.use(stream());
    pipeline.use(compress(options.compress));
    pipeline.use(send());

    return pipeline.execute.bind(pipeline);
};

module.exports = static;