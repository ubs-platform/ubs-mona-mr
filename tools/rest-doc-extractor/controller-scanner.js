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
const ts_morph_1 = require("ts-morph");
const typescript_utils_js_1 = require("./parser/typescript-utils.js");
const path = __importStar(require("path"));
const extractReturnTypes_js_1 = require("./parser/extractReturnTypes.js");
const directory_util_js_1 = require("../util/directory-util.js");
class ControllerScanner {
    static getTypescriptRootProject(mainPath) {
        const project = new ts_morph_1.Project({
            tsConfigFilePath: path.join(mainPath, 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
        project.addSourceFilesAtPaths([
            mainPath + '/apps/**/*.ts',
            mainPath + '/libs/**/*.ts',
        ]);
        return project;
    }
    static collectClasses(typescriptProject) {
        const project = typescriptProject;
        const allClasses = [];
        project.getSourceFiles().forEach((typescriptFile) => {
            const baseName = typescriptFile.getBaseName();
            const skipPatterns = [
                '.spec.ts',
                '.enum.ts',
            ];
            const skipPaths = ['dist', 'rest-doc-extractor'];
            if (skipPatterns.some((pattern) => baseName.endsWith(pattern)) ||
                skipPaths.some((p) => typescriptFile.getFilePath().includes(p + '/'))) {
                console.info("Atlanıyor: " + baseName);
                return;
            }
            typescriptFile.getClasses().forEach((tsClass) => {
                console.info("Ekleniyor " + tsClass.getName());
                allClasses.push(tsClass);
            });
        });
        return allClasses;
    }
    static isControllerClass(tsClass) {
        return tsClass.getDecorator('Controller');
    }
    static isModuleClass(tsClass) {
        return tsClass.getDecorator('Module');
    }
    static getControllerMethods(appModuleName, prefix, tsClass) {
        const parentPath = this.isControllerClass(tsClass)?.getArguments()?.at(0)?.getText()?.replace(/['"`]/g, '') ?? '';
        const methods = [];
        tsClass.getMethods().forEach((method) => {
            const methodDecorators = [
                method.getDecorator('Get'),
                method.getDecorator('Post'),
                method.getDecorator('Put'),
                method.getDecorator('Delete'),
            ].filter((a) => a);
            if (!methodDecorators || methodDecorators.length <= 0)
                return;
            let reqBody = null;
            const returnTypeRaw = typescript_utils_js_1.TypescriptNestUtils.extractFromPromise(method.getReturnType());
            const restMethodDecorator = methodDecorators[0];
            const queryParameters = [];
            const pathParameters = [];
            let methodType = restMethodDecorator.getName();
            let restPath = typescript_utils_js_1.TypescriptNestUtils.firstParameterAsString(restMethodDecorator);
            console.info(restPath);
            method.getParameters().forEach((parameter) => {
                if (!parameter)
                    return;
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
                            .getTypeNode()?.getType();
                        if (bodyType == null) {
                            console.error('Body parametresinin tipi bulunamadı: ' +
                                parameter.getName());
                            return;
                        }
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
                methodName: method.getName(),
                description: method.getJsDocs()
                    .map(doc => doc.getDescription().trim())
                    .filter(d => d)
                    .join('\n') || undefined,
                path: this.combineRestPath(prefix, parentPath, restPath).replace(/\\/g, '/'),
                queryParameters: queryParameters,
                pathParameters: pathParameters,
                responseType: returnRestAp,
                requestBody: reqBody || {
                    typeNode: null,
                    typeName: 'void',
                    importedFrom: null,
                    typeExpandedText: 'void',
                },
                applicationModuleName: appModuleName
            });
        });
        const baseClass = tsClass.getBaseClass();
        if (baseClass) {
            const baseClassFilePath = baseClass.getSourceFile().getFilePath();
            if (baseClassFilePath.includes("@ubs-platform") && baseClassFilePath.includes("base-crud-controller.d.ts")) {
                const typeArgs = tsClass.getExtends()?.getTypeArguments() ?? [];
                const idType = typeArgs[1]?.getType() ?? null;
                const inputType = typeArgs[2]?.getType() ?? null;
                const outputType = typeArgs[3]?.getType() ?? null;
                const searchType = typeArgs[4]?.getType() ?? null;
                const makeTypeInfo = (type, fallbackName) => {
                    if (!type)
                        return { typeNode: null, typeName: fallbackName, importedFrom: null, typeExpandedText: fallbackName };
                    const typeName = type.getSymbol()?.getName() ?? type.getText() ?? fallbackName;
                    const importedFrom = typescript_utils_js_1.TypescriptNestUtils.findImportSource(type);
                    const typeExpandedText = (0, extractReturnTypes_js_1.inlineTypeText)(type, null, { maxDepth: 1 });
                    return { typeNode: type, typeName, importedFrom, typeExpandedText };
                };
                const idPrimitive = [{
                        parameterName: 'id',
                        typeNode: idType,
                        typeName: idType?.getText() ?? 'any',
                    }];
                const searchProps = searchType
                    ? typescript_utils_js_1.TypescriptNestUtils.propertiesFromType(searchType)
                    : [];
                const inputInfo = makeTypeInfo(inputType, 'any');
                const outputInfo = makeTypeInfo(outputType, 'any');
                const outputArrayInfo = {
                    ...outputInfo,
                    typeName: outputInfo.typeName ? outputInfo.typeName + '[]' : 'any[]',
                    typeExpandedText: outputInfo.typeExpandedText + '[]',
                };
                const voidInfo = { typeNode: null, typeName: 'void', importedFrom: null, typeExpandedText: 'void' };
                methods.push({
                    applicationModuleName: appModuleName,
                    methodName: 'fetchAll',
                    methodType: 'GET',
                    path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                    queryParameters: searchProps,
                    pathParameters: [],
                    requestBody: voidInfo,
                    responseType: outputArrayInfo,
                }, {
                    applicationModuleName: appModuleName,
                    methodName: 'search',
                    methodType: 'GET',
                    path: this.combineRestPath(prefix, parentPath, '_search').replace(/\\/g, '/'),
                    queryParameters: searchProps,
                    pathParameters: [],
                    requestBody: voidInfo,
                    responseType: outputInfo,
                }, {
                    applicationModuleName: appModuleName,
                    methodName: 'fetchOne',
                    methodType: 'GET',
                    path: this.combineRestPath(prefix, parentPath, ':id').replace(/\\/g, '/'),
                    queryParameters: [],
                    pathParameters: idPrimitive,
                    requestBody: voidInfo,
                    responseType: outputInfo,
                }, {
                    applicationModuleName: appModuleName,
                    methodName: 'add',
                    methodType: 'POST',
                    path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                    queryParameters: [],
                    pathParameters: [],
                    requestBody: inputInfo,
                    responseType: outputInfo,
                }, {
                    applicationModuleName: appModuleName,
                    methodName: 'edit',
                    methodType: 'PUT',
                    path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                    queryParameters: [],
                    pathParameters: [],
                    requestBody: inputInfo,
                    responseType: outputInfo,
                }, {
                    applicationModuleName: appModuleName,
                    methodName: 'remove',
                    methodType: 'DELETE',
                    path: this.combineRestPath(prefix, parentPath, ':id').replace(/\\/g, '/'),
                    queryParameters: [],
                    pathParameters: idPrimitive,
                    requestBody: voidInfo,
                    responseType: voidInfo,
                });
                return methods;
            }
            const baseMethods = this.getControllerMethods(appModuleName, prefix, baseClass);
            for (const baseMethod of baseMethods) {
                if (!methods.some(m => m.methodName === baseMethod.methodName)) {
                    methods.push(baseMethod);
                }
            }
        }
        return methods;
    }
    static extractControllerClassesFromModuleClass(tsClass, allClasses = [], maxDepth = 2, _visited = new Set()) {
        const controllerClasses = [];
        const moduleDecorator = this.isModuleClass(tsClass);
        if (!moduleDecorator)
            return controllerClasses;
        const className = tsClass.getName() ?? '';
        if (_visited.has(className))
            return controllerClasses;
        _visited.add(className);
        const firstArg = moduleDecorator.getArguments()[0];
        if (!firstArg || !firstArg.asKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression))
            return controllerClasses;
        const objLiteral = firstArg.asKind(ts_morph_1.SyntaxKind.ObjectLiteralExpression);
        if (!objLiteral)
            return controllerClasses;
        const controllersProp = objLiteral
            .getProperty('controllers')
            ?.asKind(ts_morph_1.SyntaxKind.PropertyAssignment);
        if (controllersProp) {
            const arrayTypeInitializer = controllersProp.getInitializer()
                ?.asKind(ts_morph_1.SyntaxKind.ArrayLiteralExpression);
            if (arrayTypeInitializer) {
                arrayTypeInitializer.getElements().forEach(el => {
                    const text = el.getText();
                    const foundClass = allClasses.find(c => c.getName() === text)
                        ?? tsClass.getSourceFile().getClass(text);
                    if (foundClass) {
                        controllerClasses.push(foundClass);
                    }
                });
            }
        }
        if (maxDepth > 0 && allClasses.length > 0) {
            const importsProp = objLiteral
                .getProperty('imports')
                ?.asKind(ts_morph_1.SyntaxKind.PropertyAssignment);
            if (importsProp) {
                const importsArray = importsProp.getInitializer()
                    ?.asKind(ts_morph_1.SyntaxKind.ArrayLiteralExpression);
                if (importsArray) {
                    importsArray.getElements().forEach(el => {
                        const moduleName = el.getText();
                        const moduleClass = allClasses.find(c => c.getName() === moduleName);
                        if (moduleClass) {
                            const controllersFromImport = this.extractControllerClassesFromModuleClass(moduleClass, allClasses, maxDepth - 1, _visited);
                            controllerClasses.push(...controllersFromImport);
                        }
                    });
                }
            }
        }
        return controllerClasses;
    }
    static collectControllerClassesFromModuleClasses(allClasses) {
        const controllerClasses = [];
        this.circulateControllerClassesFromModuleClasses(allClasses, allClasses, (controllerClass) => {
            if (!controllerClasses.includes(controllerClass)) {
                controllerClasses.push(controllerClass);
            }
        });
        return controllerClasses;
    }
    static circulateControllerClassesFromModuleClasses(moduleClasses, resolutionClasses, cb) {
        for (let index = 0; index < moduleClasses.length; index++) {
            const tsClass = moduleClasses[index];
            if (!this.isModuleClass(tsClass)) {
                console.info("Bir modül değil, atlanıyor: ", tsClass.getName());
                continue;
            }
            console.info("İnceleniyor: ", tsClass.getName());
            const controllersInModule = this.extractControllerClassesFromModuleClass(tsClass, resolutionClasses);
            const extendedClass = tsClass.getBaseClass();
            if (extendedClass) {
                const controllersInExtendedModule = this.extractControllerClassesFromModuleClass(extendedClass, resolutionClasses);
                controllersInExtendedModule.forEach(c => {
                    const controllerDecorator = this.isControllerClass(c);
                    if (!controllerDecorator) {
                        console.info("Bir controller değil: " + c.getName());
                        return;
                    }
                    cb(c);
                });
            }
            controllersInModule.forEach(c => {
                if (!this.isControllerClass(c)) {
                    console.info("Bir controller değil: " + c.getName());
                    return;
                }
                cb(c);
            });
        }
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
    static extractGlobalPrefixFromSourceFile(sourceFileText) {
        const capturedGlobalPrefix = /globalPrefix\s*=\s*"(.*)"|globalPrefix\s*=\s*'(.*)'|\.setGlobalPrefix\(('.*')\)|\.setGlobalPrefix\("(.*)"\)/g.exec(sourceFileText);
        if (capturedGlobalPrefix) {
            return capturedGlobalPrefix[1] ||
                capturedGlobalPrefix[2] ||
                capturedGlobalPrefix[3] ||
                '';
        }
        return '';
    }
    static async scanAllControllers(mainPath) {
        const methodsMappedByApp = {};
        const appsPath = path.join(mainPath, 'apps');
        const appList = await directory_util_js_1.DirectoryUtil.listFolderNamesNoRecursive(appsPath);
        const rootProject = this.getTypescriptRootProject(mainPath);
        const allProjectClasses = this.collectClasses(rootProject);
        for (let index = 0; index < appList.length; index++) {
            const appName = appList[index];
            console.info('Scanning application: ' + appName);
            let globalPrefix = '';
            const collections = [];
            const appClasses = allProjectClasses.filter(a => a.getSourceFile().getFilePath().includes(path.join('apps', appName, 'src')));
            const mainSourceFile = rootProject.getSourceFiles().find(sf => sf.getFilePath().includes(path.join('apps', appName, 'src', 'main.ts')));
            if (mainSourceFile) {
                globalPrefix = this.extractGlobalPrefixFromSourceFile(mainSourceFile.getFullText());
            }
            this.circulateControllerClassesFromModuleClasses(appClasses, allProjectClasses, (controllerClass) => {
                collections.push({
                    methods: this.getControllerMethods(appName, globalPrefix, controllerClass),
                    name: controllerClass.getName() || "unnamed",
                    parentPath: ""
                });
            });
            if (methodsMappedByApp[appName] == null) {
                methodsMappedByApp[appName] = [];
            }
            methodsMappedByApp[appName].push(...collections);
        }
        console.log("Çıkış: ", methodsMappedByApp);
        return methodsMappedByApp;
    }
    static combineRestPath(...segments) {
        return segments
            .filter(p => p && p.trim() !== '')
            .map(p => p.replace(/^\/|\/$/g, ''))
            .join('/');
    }
}
exports.ControllerScanner = ControllerScanner;
//# sourceMappingURL=controller-scanner.js.map