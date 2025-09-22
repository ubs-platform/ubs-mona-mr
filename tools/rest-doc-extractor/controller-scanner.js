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
exports.ControllerScanner = void 0;
const path_1 = require("path");
const ts_morph_1 = require("ts-morph");
const typescript_utils_js_1 = require("./parser/typescript-utils.js");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const extractReturnTypes_js_1 = require("./parser/extractReturnTypes.js");
class ControllerScanner {
    static scanAllControllers(mainPath) {
        const collectionsByProject = {};
        const globalPrefixes = {};
        const project = new ts_morph_1.Project({
            tsConfigFilePath: path.join(mainPath, 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
        const testSourceFiles = project.addSourceFilesAtPaths([
            mainPath + '/apps/**/*.ts',
            mainPath + '/libs/**/*.ts',
        ]);
        testSourceFiles.forEach((typescriptFile) => {
            const baseName = typescriptFile.getBaseName();
            const skipPatterns = [
                '.d.ts',
                '.spec.ts',
                '.module.ts',
                '.enum.ts',
            ];
            const skipPaths = ['node_modules', 'dist', 'rest-doc-extractor'];
            if (skipPatterns.some((pattern) => baseName.endsWith(pattern)) ||
                skipPaths.some((p) => typescriptFile.getFilePath().includes(p + '/'))) {
                return;
            }
            mainPath + '/**/*.ts';
            const appNameRegex = /apps\/([^\/]+)\/src/, libNameRegex = /libs\/([^\/]+)\/src/;
            const appMatch = typescriptFile.getFilePath().match(appNameRegex), libMatch = typescriptFile.getFilePath().match(libNameRegex);
            let projectName = 'unknown';
            if (appMatch || libMatch) {
                projectName = (appMatch ? appMatch[1] : libMatch[1]).replace(/[^a-zA-Z0-9]/g, '-');
            }
            else {
                projectName = 'root-' + (0, crypto_1.randomUUID)().slice(0, 4);
            }
            if (!collectionsByProject[projectName]) {
                collectionsByProject[projectName] = [];
            }
            const collectionsForThisProject = collectionsByProject[projectName];
            const filePath = typescriptFile.getFilePath();
            console.info('Dosya: ' + filePath);
            if (filePath.includes('main.ts')) {
                const capturedGlobalPrefix = /globalPrefix\s*=\s*"(.*)"|globalPrefix\s*=\s*'(.*)'|\.setGlobalPrefix\(('.*')\)|\.setGlobalPrefix\("(.*)"\)/g.exec(typescriptFile.getFullText());
                if (capturedGlobalPrefix) {
                    globalPrefixes[projectName] =
                        capturedGlobalPrefix[1] ||
                            capturedGlobalPrefix[2] ||
                            capturedGlobalPrefix[3] ||
                            capturedGlobalPrefix[4];
                    console.info('Global prefix: ' +
                        (capturedGlobalPrefix[1] ||
                            capturedGlobalPrefix[2] ||
                            capturedGlobalPrefix[3] ||
                            capturedGlobalPrefix[4]));
                }
            }
            typescriptFile.getClasses().forEach((tsClass) => {
                const itIsController = tsClass.getDecorator('Controller');
                if (itIsController) {
                    let parentPath = typescript_utils_js_1.TypescriptNestUtils.firstParameterAsString(itIsController);
                    console.debug(tsClass.getName() + ' bir controller');
                    const methods = [];
                    tsClass.getMethods().forEach((method) => {
                        const methodDecorators = [
                            method.getDecorator('Get'),
                            method.getDecorator('Post'),
                            method.getDecorator('Put'),
                            method.getDecorator('Delete'),
                        ].filter((a) => a);
                        if (methodDecorators[0]) {
                            let reqBody;
                            const returnTypeRaw = typescript_utils_js_1.TypescriptNestUtils.extractFromPromise(method.getReturnType());
                            const restMethodDecorator = methodDecorators[0];
                            const queryParameters = [];
                            const pathParameters = [];
                            let methodType = restMethodDecorator.getName();
                            let path = (0, path_1.join)(typescript_utils_js_1.TypescriptNestUtils.firstParameterAsString(restMethodDecorator));
                            console.info(path);
                            method.getParameters().forEach((parameter) => {
                                const restParameterTypeName = parameter
                                    .getDecorators()
                                    .find((a) => ['Body', 'Query', 'Param'].includes(a.getName()))
                                    ?.getName();
                                if (!restParameterTypeName) {
                                    console.error('Bilinmeyen parametre türü: ' +
                                        parameter.getName() +
                                        ' dekoratör bulunamadı');
                                }
                                else {
                                    if (restParameterTypeName === 'Body') {
                                        const bodyType = parameter
                                            .getTypeNode()
                                            .getType();
                                        const typeText = (0, extractReturnTypes_js_1.inlineTypeText)(bodyType, method, {});
                                        reqBody = {
                                            typeNode: bodyType,
                                            typeName: bodyType
                                                .getSymbol()
                                                ?.getName() ??
                                                bodyType.getText(),
                                            importedFrom: typescript_utils_js_1.TypescriptNestUtils.findImportSource(bodyType),
                                            typeExpandedText: typeText,
                                        };
                                        console.info('Payload parametre: ' +
                                            parameter.getName() +
                                            ' tipi: ' +
                                            parameter.getType().getText());
                                    }
                                    else {
                                        const extractedParameters = typescript_utils_js_1.TypescriptNestUtils.extractRestMethodPrimitiveParameterInfo(parameter);
                                        if (restParameterTypeName === 'Query') {
                                            queryParameters.push(...extractedParameters);
                                        }
                                        else if (restParameterTypeName === 'Param') {
                                            pathParameters.push(...extractedParameters);
                                        }
                                    }
                                }
                            });
                            const returnTypeInline = (0, extractReturnTypes_js_1.inlineTypeText)(returnTypeRaw, method, { maxDepth: 1 });
                            const returnRestAp = {
                                typeNode: returnTypeRaw,
                                typeName: ControllerScanner.returnTypeNameDetermination(returnTypeRaw),
                                importedFrom: typescript_utils_js_1.TypescriptNestUtils.findImportSource(returnTypeRaw),
                                typeExpandedText: returnTypeInline,
                            };
                            methods.push({
                                methodType: methodType.toUpperCase(),
                                path: path,
                                methodName: method.getName(),
                                queryParameters: queryParameters,
                                pathParameters: pathParameters,
                                responseType: returnRestAp,
                                requestBody: reqBody,
                            });
                        }
                    });
                    collectionsForThisProject.push({
                        methods: methods,
                        name: tsClass.getName(),
                        parentPath,
                    });
                }
            });
        });
        Object.keys(collectionsByProject).forEach((key) => {
            const globalPrefix = globalPrefixes[key];
            if (globalPrefix) {
                collectionsByProject[key].forEach((controller) => {
                    controller.parentPath =
                        '/' +
                            path.join('service', key, globalPrefix, controller.parentPath);
                });
            }
        });
        return collectionsByProject;
    }
    static returnTypeNameDetermination(returnTypeRaw) {
        if (returnTypeRaw.isArray()) {
            const arrayElementType = returnTypeRaw.getArrayElementType();
            if (arrayElementType) {
                return (ControllerScanner.returnTypeNameDetermination(arrayElementType) + '[]');
            }
            else {
                return 'any[]';
            }
        }
        else if (returnTypeRaw.isUnion()) {
            return returnTypeRaw
                .getUnionTypes()
                .map((t) => ControllerScanner.returnTypeNameDetermination(t))
                .join(' | ');
        }
        else if (returnTypeRaw.isIntersection()) {
            return returnTypeRaw
                .getIntersectionTypes()
                .map((t) => ControllerScanner.returnTypeNameDetermination(t))
                .join(' & ');
        }
        else if (returnTypeRaw.isAnonymous()) {
            return (0, extractReturnTypes_js_1.inlineTypeText)(returnTypeRaw, null, { maxDepth: 1 });
        }
        else if (returnTypeRaw.isString()) {
            return 'string';
        }
        else if (returnTypeRaw.isNumber()) {
            return 'number';
        }
        else if (returnTypeRaw.isBoolean()) {
            return 'boolean';
        }
        else if (returnTypeRaw.isUndefined()) {
            return 'undefined';
        }
        const typeArgs = returnTypeRaw.getTypeArguments();
        let tsArgsStr = '';
        if (typeArgs.length) {
            tsArgsStr =
                '<' +
                    typeArgs
                        .map((t) => ControllerScanner.returnTypeNameDetermination(t))
                        .join(', ') +
                    '>';
        }
        return ((returnTypeRaw.getSymbol()?.getName() ?? returnTypeRaw.getText()) +
            tsArgsStr);
    }
}
exports.ControllerScanner = ControllerScanner;
//# sourceMappingURL=controller-scanner.js.map