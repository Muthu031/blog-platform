"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const HelloQuerySchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
});
const getHello = (req, res, next) => {
    try {
        const parsed = HelloQuerySchema.parse(req.query);
        const name = parsed.name ?? 'world';
        res.json({ message: `Hello, ${name}!` });
    }
    catch (err) {
        next(err);
    }
};
exports.default = { getHello };
