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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgxServiceFileGenerator = void 0;
const templates_1 = require("./templates");
const path_1 = __importDefault(require("path"));
const directory_util_1 = require("../util/directory-util");
const FileSystem = __importStar(require("fs/promises"));
const naming_util_1 = require("../util/naming-util");
class NgxServiceFileGenerator {
    static generateServiceClassStr(workDir, libraryPackageName, controller) {
        const className = `${controller.name}Service`;
        const necessaryImports = (0, templates_1.ANGULAR_SERVICE_NECESSARY_IMPORTS)(workDir, libraryPackageName, controller.methods);
        const methods = controller.methods.map(method => (0, templates_1.ANGULAR_SERVICE_METHOD)(method)).join('\n');
        return `${templates_1.ANGULAR_SERVICE_HEADER}\n${necessaryImports}\n${(0, templates_1.ANGULAR_SERVICE_FILE_CORE_HEAD)(className, controller.parentPath)}\n${methods}\n${templates_1.ANGULAR_SERVICE_FILE_CORE_TAIL}`;
    }
    static async saveServiceToPath(workDir, libraryPackageName, savingPathPrefix, controller) {
        await directory_util_1.DirectoryUtil.ensureDirectory(savingPathPrefix);
        const servicePath = path_1.default.join(savingPathPrefix, `${naming_util_1.NamingUtil.camelOrPascalToKebab(controller.name)}.service.ts`);
        await FileSystem.writeFile(servicePath, this.generateServiceClassStr(workDir, libraryPackageName, controller), 'utf8');
    }
    static async generateAndSaveServices(workDir, libraryPackageName, savingPathPrefix, controllers) {
        for (let index = 0; index < controllers.length; index++) {
            const controller = controllers[index];
            if (controller.methods.length == 0) {
                continue;
            }
            await this.saveServiceToPath(workDir, libraryPackageName, savingPathPrefix, controller);
        }
    }
}
exports.NgxServiceFileGenerator = NgxServiceFileGenerator;
//# sourceMappingURL=ngx-service-file-generator.js.map