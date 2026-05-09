"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestApiDocGen = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const controller_scanner_1 = require("../rest-doc-extractor/controller-scanner");
const directory_util_1 = require("../util/directory-util");
const child_process_1 = require("child_process");
class RestApiDocGen {
    static async generate() {
        const mainPath = process.cwd();
        console.info('Project directory: ' + mainPath);
        const byProject = await controller_scanner_1.ControllerScanner.scanAllControllers(mainPath);
        if (Object.entries(byProject).length == 0) {
            (0, child_process_1.exec)(`kdialog --msgbox 'ByProject içi dolu gelmiyor...'`);
        }
        Object.entries(byProject).forEach(([key, ac]) => {
            console.info(key, ac);
            ac.forEach((c) => {
                c.methods.forEach((m) => {
                    m.pathParameters.forEach((p) => { p.typeNode = null; });
                    m.queryParameters.forEach((p) => { p.typeNode = null; });
                    if (m.requestBody)
                        m.requestBody.typeNode = null;
                    if (m.responseType)
                        m.responseType.typeNode = null;
                });
            });
        });
        await directory_util_1.DirectoryUtil.ensureDirectory('xr-generated');
        (0, fs_1.writeFileSync)('xr-generated/rest-api.json', JSON.stringify(byProject, null, 2));
        const docsDir = path_1.default.join(mainPath, 'docs', 'rest-api');
        await directory_util_1.DirectoryUtil.ensureDirectory(docsDir);
        for (const [appName, collections] of Object.entries(byProject)) {
            const md = RestApiDocGen.renderAppMarkdown(appName, collections);
            (0, fs_1.writeFileSync)(path_1.default.join(docsDir, `${appName}.md`), md, 'utf-8');
            console.info(`Markdown kaydedildi: docs/rest-api/${appName}.md`);
        }
        const indexLines = [
            '# REST API Dökümantasyonu',
            '',
            '| Uygulama | Dosya |',
            '|----------|-------|',
            ...Object.keys(byProject).map(app => `| ${app} | [${app}.md](./${app}.md) |`),
        ];
        (0, fs_1.writeFileSync)(path_1.default.join(docsDir, 'index.md'), indexLines.join('\n'), 'utf-8');
    }
    static renderAppMarkdown(appName, collections) {
        const lines = [`# ${appName} REST API`, ''];
        for (const collection of collections) {
            lines.push(`## ${collection.name}`);
            if (collection.parentPath) {
                lines.push('', `**Base path:** \`${collection.parentPath}\``);
            }
            lines.push('');
            if (collection.methods.length === 0) {
                lines.push('_Metot bulunamadı._', '');
                continue;
            }
            for (const method of collection.methods) {
                lines.push(...RestApiDocGen.renderMethodMarkdown(method));
            }
        }
        return lines.join('\n');
    }
    static renderMethodMarkdown(method) {
        const lines = [];
        const pathDisplay = method.path ? `\`${method.path}\`` : '_yol yok_';
        lines.push(`### \`${method.methodType}\` ${pathDisplay}`, '');
        lines.push(`**Metot adı:** \`${method.methodName}\``, '');
        if (method.description) {
            lines.push(`> ${method.description.replace(/\n/g, '\n> ')}`, '');
        }
        if (method.pathParameters?.length) {
            lines.push('**Path parametreleri:**', '');
            lines.push('| İsim | Tip |', '|------|-----|');
            for (const p of method.pathParameters) {
                lines.push(`| \`${p.parameterName}\` | \`${RestApiDocGen.safeTypeName(p)}\` |`);
            }
            lines.push('');
        }
        if (method.queryParameters?.length) {
            lines.push('**Query parametreleri:**', '');
            lines.push('| İsim | Tip |', '|------|-----|');
            for (const p of method.queryParameters) {
                lines.push(`| \`${p.parameterName}\` | \`${RestApiDocGen.safeTypeName(p)}\` |`);
            }
            lines.push('');
        }
        const reqBody = method.requestBody;
        if (reqBody?.typeName && reqBody.typeName !== 'void') {
            lines.push('**Request body:**', '');
            lines.push('```', this.formatExpandedText(reqBody.typeExpandedText) ?? reqBody.typeName, '```');
            if (reqBody.importedFrom)
                lines.push('', `_Kaynak: \`${reqBody.importedFrom}\`_`);
            lines.push('');
        }
        const resType = method.responseType;
        if (resType?.typeName) {
            lines.push('**Yanıt tipi:**', '');
            lines.push('```', this.formatExpandedText(resType.typeExpandedText) ?? resType.typeName, '```');
            if (resType.importedFrom)
                lines.push('', `_Kaynak: \`${resType.importedFrom}\`_`);
            lines.push('');
        }
        lines.push('---', '');
        return lines;
    }
    static formatExpandedText(typeExpandedText) {
        if (!typeExpandedText)
            return '';
        let indent = 0;
        let result = '';
        let skipSpaces = false;
        for (let i = 0; i < typeExpandedText.length; i++) {
            const ch = typeExpandedText[i];
            if (skipSpaces && ch === ' ')
                continue;
            skipSpaces = false;
            if (ch === '{') {
                indent++;
                result += '{\n' + '  '.repeat(indent);
                skipSpaces = true;
            }
            else if (ch === '}') {
                indent = Math.max(0, indent - 1);
                result = result.replace(/[ \t]+$/, '');
                result += '\n' + '  '.repeat(indent) + '}';
            }
            else if (ch === ';') {
                result += ';\n' + '  '.repeat(indent);
                skipSpaces = true;
            }
            else {
                result += ch;
            }
        }
        return result.trim();
    }
    static safeTypeName(p) {
        return p.typeName.replaceAll("|", "\\|") ?? 'any';
    }
}
exports.RestApiDocGen = RestApiDocGen;
//# sourceMappingURL=rest-api-doc-gen.js.map