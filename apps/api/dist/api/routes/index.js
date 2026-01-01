"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const hello_1 = __importDefault(require("../controllers/hello"));
const router = (0, express_1.Router)();
router.get('/hello', hello_1.default.getHello);
exports.default = router;
