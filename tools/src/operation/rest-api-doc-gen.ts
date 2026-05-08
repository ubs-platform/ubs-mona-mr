import { writeFileSync } from 'fs';
import path from 'path';
import { ControllerScanner } from '../rest-doc-extractor/controller-scanner';
import { RestApiCollection, RestApiMethod, RestPrimitiveTypeInfo } from '../rest-doc-extractor/parser/api.data';
import { DirectoryUtil } from '../util/directory-util';
import { exec } from 'child_process';

export class RestApiDocGen {
    static async generate() {
        const mainPath = process.cwd();
        console.info('Project directory: ' + mainPath);
        const byProject = await ControllerScanner.scanAllControllers(mainPath);
        if (Object.entries(byProject).length == 0) {
            exec(`kdialog --msgbox 'ByProject içi dolu gelmiyor...'`)
        }
        Object.entries(byProject).forEach(([key, ac]) => {
            console.info(key, ac)
            ac.forEach((c) => {
                c.methods.forEach((m) => {
                    m.pathParameters.forEach((p) => { (p as any).typeNode = null; });
                    m.queryParameters.forEach((p) => { (p as any).typeNode = null; });
                    if (m.requestBody) m.requestBody.typeNode = null;
                    if (m.responseType) m.responseType.typeNode = null;
                });
            });
        });

        await DirectoryUtil.ensureDirectory('xr-generated');
        writeFileSync('xr-generated/rest-api.json', JSON.stringify(byProject, null, 2));

        // Markdown dökümantasyonu docs/rest-api/ klasörüne kaydet
        const docsDir = path.join(mainPath, 'docs', 'rest-api');
        await DirectoryUtil.ensureDirectory(docsDir);

        for (const [appName, collections] of Object.entries(byProject)) {
            const md = RestApiDocGen.renderAppMarkdown(appName, collections);
            writeFileSync(path.join(docsDir, `${appName}.md`), md, 'utf-8');
            console.info(`Markdown kaydedildi: docs/rest-api/${appName}.md`);
        }

        const indexLines = [
            '# REST API Dökümantasyonu',
            '',
            '| Uygulama | Dosya |',
            '|----------|-------|',
            ...Object.keys(byProject).map(app => `| ${app} | [${app}.md](./${app}.md) |`),
        ];
        writeFileSync(path.join(docsDir, 'index.md'), indexLines.join('\n'), 'utf-8');
    }

    private static renderAppMarkdown(appName: string, collections: RestApiCollection[]): string {
        const lines: string[] = [`# ${appName} REST API`, ''];

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

    private static renderMethodMarkdown(method: RestApiMethod): string[] {
        const lines: string[] = [];
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
            if (reqBody.importedFrom) lines.push('', `_Kaynak: \`${reqBody.importedFrom}\`_`);
            lines.push('');
        }

        const resType = method.responseType;
        if (resType?.typeName) {
            lines.push('**Yanıt tipi:**', '');
            lines.push('```', this.formatExpandedText(resType.typeExpandedText) ?? resType.typeName, '```');
            if (resType.importedFrom) lines.push('', `_Kaynak: \`${resType.importedFrom}\`_`);
            lines.push('');
        }

        lines.push('---', '');
        return lines;
    }

    static formatExpandedText(typeExpandedText: string): string {
        if (!typeExpandedText) return '';
        let indent = 0;
        let result = '';
        let skipSpaces = false;
        for (let i = 0; i < typeExpandedText.length; i++) {
            const ch = typeExpandedText[i];
            if (skipSpaces && ch === ' ') continue;
            skipSpaces = false;
            if (ch === '{') {
                indent++;
                result += '{\n' + '  '.repeat(indent);
                skipSpaces = true;
            } else if (ch === '}') {
                indent = Math.max(0, indent - 1);
                result = result.replace(/[ \t]+$/, '');
                result += '\n' + '  '.repeat(indent) + '}';
            } else if (ch === ';') {
                result += ';\n' + '  '.repeat(indent);
                skipSpaces = true;
            } else {
                result += ch;
            }
        }
        return result.trim();
    }

    private static safeTypeName(p: RestPrimitiveTypeInfo): string {
        return p.typeName.replaceAll("|", "\\|") ?? 'any';
    }
}
