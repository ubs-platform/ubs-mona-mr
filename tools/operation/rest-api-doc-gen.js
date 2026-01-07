"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiDocGen = void 0;
const fs_1 = require("fs");
const controller_scanner_1 = require("../rest-doc-extractor/controller-scanner");
const directory_util_1 = require("../util/directory-util");
class RestApiDocGen {
    static async generate() {
        const mainPath = process.cwd();
        console.info('Project directory: ' + mainPath);
        const byProject = controller_scanner_1.ControllerScanner.scanAllControllers(mainPath);
        Object.entries(byProject).forEach(([key, ac]) => {
            ac.forEach((c) => {
                c.methods.forEach((m) => {
                    m.pathParameters.forEach((p) => {
                        p.typeNode = undefined;
                    });
                    m.queryParameters.forEach((p) => {
                        p.typeNode = undefined;
                    });
                    if (m.requestBody) {
                        m.requestBody.typeNode = undefined;
                    }
                    if (m.responseType) {
                        m.responseType.typeNode = undefined;
                    }
                });
            });
        });
        await directory_util_1.DirectoryUtil.ensureDirectory('apps/dev-monolith/apidocs');
        (0, fs_1.writeFileSync)('apps/dev-monolith/apidocs/rest-api.json', JSON.stringify(byProject, null, 2));
    }
}
exports.RestApiDocGen = RestApiDocGen;
//# sourceMappingURL=rest-api-doc-gen.js.map