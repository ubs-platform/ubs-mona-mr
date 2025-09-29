"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiAngularClientGen = void 0;
const controller_scanner_1 = require("../rest-doc-extractor/controller-scanner");
const directory_util_1 = require("../util/directory-util");
const ngx_service_file_generator_1 = require("../angular-http-service-generator/ngx-service-file-generator");
const path_1 = __importDefault(require("path"));
class RestApiAngularClientGen {
    static async generate(workDir, paket, exportPath) {
        const mainPath = workDir;
        console.info('Project directory: ' + mainPath);
        const byProject = controller_scanner_1.ControllerScanner.scanAllControllers(mainPath);
        const exportPathEdited = exportPath ? exportPath : `${mainPath}/xr-generated/angular-services/${paket.packageObject.name}`;
        await directory_util_1.DirectoryUtil.ensureDirectory(exportPathEdited);
        const projKeys = Object.keys(byProject);
        for (let index = 0; index < projKeys.length; index++) {
            const key = projKeys[index];
            const projectControllers = byProject[key];
            await ngx_service_file_generator_1.NgxServiceFileGenerator.generateAndSaveServices(workDir, paket.packageObject.iksir.childrenPrefix, path_1.default.join(exportPathEdited, key), projectControllers);
        }
    }
}
exports.RestApiAngularClientGen = RestApiAngularClientGen;
//# sourceMappingURL=rest-api-angular-client-gen.js.map