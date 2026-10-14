// Express 4 does not catch errors thrown inside async functions. This wrapper does.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
