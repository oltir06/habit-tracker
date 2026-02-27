const {
    httpRequestDuration,
    httpRequestsTotal,
    httpRequestsActive
} = require('../utils/metrics');

const metricsMiddleware = (req, res, next) => {
    const start = Date.now();

    // Increment active requests
    httpRequestsActive.inc();

    // Override res.send to capture metrics
    const originalSend = res.send;
    res.send = function (data) {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        // Record metrics
        httpRequestDuration.observe(
            { method: req.method, route, status: res.statusCode },
            duration
        );

        httpRequestsTotal.inc(
            { method: req.method, route, status: res.statusCode }
        );

        httpRequestsActive.dec();

        return originalSend.call(this, data);
    };

    next();
};

module.exports = metricsMiddleware;
