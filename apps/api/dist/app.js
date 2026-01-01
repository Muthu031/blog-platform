"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./api/routes"));
const errorHandler_1 = require("./api/middlewares/errorHandler");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Explicit type annotation so the exported `app` has a stable, portable type
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api', routes_1.default);
app.use(errorHandler_1.errorHandler);
exports.default = app;
