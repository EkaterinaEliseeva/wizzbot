"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class FileSystemManager {
    async readFile(path) {
        await this.ensureDataDir(path);
        return promises_1.default.readFile(path, 'utf-8');
    }
    async writeFile(path, data) {
        return promises_1.default.writeFile(path, data, 'utf-8');
    }
    /**
     * Checks if the data directory exists and creates it if it does not.
     *
     * The data directory is determined by the path of the `SUBSCRIPTIONS_FILE`
     * constant. If the directory does not exist, it is created with the
     * `recursive` option set to `true`.
     */
    async ensureDataDir(pathToFile) {
        const dataDir = path_1.default.dirname(pathToFile);
        try {
            await promises_1.default.access(dataDir);
        }
        catch (error) {
            await promises_1.default.mkdir(dataDir, { recursive: true });
        }
    }
}
exports.FileSystemManager = FileSystemManager;
