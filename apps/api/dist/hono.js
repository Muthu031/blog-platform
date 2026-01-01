"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Small Hono example; Hono can be used for edge-friendly handlers
const hono_1 = require("hono");
const app = new hono_1.Hono();
app.get('/', (c) => c.json({ hello: 'from hono' }));
exports.default = app;
