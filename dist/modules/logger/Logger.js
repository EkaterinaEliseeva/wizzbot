"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    log(message) {
        console.log(message);
    }
    error(error) {
        console.error(error);
    }
}
exports.Logger = Logger;
