import { writeFileSync } from 'fs';
import { ControllerScanner } from '../rest-doc-extractor/controller-scanner';
import { DirectoryUtil } from '../util/directory-util';

export class RestApiDocGen {
    static async generate() {
        const mainPath = process.cwd();
        console.info('Project directory: ' + mainPath);
        const byProject = ControllerScanner.scanAllControllers(mainPath);

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
                    // m.responseType.typeNode = undefined;
                });
            });
        });
        await DirectoryUtil.ensureDirectory('xr-generated');
        // save to file
        writeFileSync(
            'xr-generated/rest-api.json',
            JSON.stringify(byProject, null, 2),
        );
    }
}
