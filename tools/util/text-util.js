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
exports.TextUtil = void 0;
const directory_util_1 = require("./directory-util");
const FileSystem = __importStar(require("fs/promises"));
class TextUtil {
    static async replaceText(path, replaceTextRecipes) {
        await directory_util_1.DirectoryUtil.circulateFilesRecursive(path, async (filePath) => {
            let content = await FileSystem.readFile(filePath, 'utf8');
            for (let index = 0; index < replaceTextRecipes.length; index++) {
                const replaceRecipe = replaceTextRecipes[index];
                let replaceWith = '';
                if (typeof replaceRecipe.replaceWith == 'function') {
                    replaceWith = await replaceRecipe.replaceWith(filePath);
                }
                else {
                    replaceWith = replaceRecipe.replaceWith;
                }
                if (replaceWith != null && replaceWith != undefined) {
                    content = content.replaceAll(replaceRecipe.finding, replaceWith);
                }
            }
            await FileSystem.writeFile(filePath, content, 'utf8');
        });
    }
    static async findByRegex(path, findings) {
        let founded = new Map();
        await directory_util_1.DirectoryUtil.circulateFilesRecursive(path, async (filePath) => {
            let content = await FileSystem.readFile(filePath, 'utf8');
            for (let findingIndex = 0; findingIndex < findings.length; findingIndex++) {
                let items = [];
                const finding = findings[findingIndex];
                let a = finding.exec(content);
                while (a) {
                    items.push({
                        found: a,
                        path: filePath,
                    });
                    a = finding.exec(content);
                }
                let arr = founded.get(finding) || [];
                arr.push(...items);
                founded.set(finding, arr);
            }
        });
        return founded;
    }
}
exports.TextUtil = TextUtil;
//# sourceMappingURL=text-util.js.map