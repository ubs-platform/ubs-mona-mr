"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectoryUtil = void 0;
const FileSystem = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const colors_1 = require("./colors");
class DirectoryUtil {
    static async listAllFiles(folderPath) {
        const allFileList = [];
        await this.circulateFilesRecursive(folderPath, (a) => {
            allFileList.push(a);
        });
        return allFileList;
    }
    static async ensureDirectory(...filePath) {
        const dirPath = path.join(...filePath);
        try {
            await FileSystem.mkdir(dirPath, { recursive: true });
        }
        catch (err) {
            console.error((0, colors_1.strColor)(colors_1.COLORS.BgRed, 'Could not create directory: ' + dirPath + '\n' + err));
            throw err;
        }
    }
    static async directoryExists(...filePath) {
        try {
            await FileSystem.access(path.join(...filePath), FileSystem.constants.F_OK);
            return true;
        }
        catch (err) {
            return false;
        }
    }
    static async circulateFilesRecursive(folderPath, fileAction) {
        const onQueue = [];
        let current = folderPath;
        while (current) {
            try {
                const fileList = await FileSystem.readdir(current);
                for (let index = 0; index < fileList.length; index++) {
                    const fileName = fileList[index];
                    const fullPath = path.join(current, fileName);
                    const fileInfo = await FileSystem.stat(fullPath);
                    if (fileInfo.isDirectory()) {
                        onQueue.push(fullPath);
                    }
                    else if (fileInfo.isFile()) {
                        await fileAction(fullPath);
                    }
                }
            }
            catch (error) {
                console.warn((0, colors_1.strColor)(colors_1.COLORS.BgYellow, 'An error occured while reading file: ' +
                    current +
                    '\nSo we skip this'));
            }
            current = onQueue.pop();
        }
    }
}
exports.DirectoryUtil = DirectoryUtil;
//# sourceMappingURL=directory-util.js.map