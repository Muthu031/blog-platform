"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    const status = err?.status || 500;
    res.status(status).json({ error: err?.message ?? 'Internal Server Error' });
}
