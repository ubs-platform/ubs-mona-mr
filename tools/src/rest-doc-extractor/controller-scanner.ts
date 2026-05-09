import { join } from 'path';
import { ClassDeclaration, ClassExpression, Decorator, Project, SyntaxKind, ts, Type } from 'ts-morph';
import {
    RestApiCollection,
    RestApiMethod,
    RestObjectTypeInfo,
    RestPrimitiveTypeInfo,
} from './parser/api.data.js';
import { TypescriptNestUtils } from './parser/typescript-utils.js';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { inlineTypeText } from './parser/extractReturnTypes.js';
import { DirectoryUtil } from '../util/directory-util.js';
import { exec } from 'child_process';

export class ControllerScanner {

    public static getTypescriptRootProject(mainPath: string) {
        const project = new Project({
            tsConfigFilePath: path.join(mainPath, 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
        });
        project.addSourceFilesAtPaths([
            mainPath + '/apps/**/*.ts',
            mainPath + '/libs/**/*.ts',
        ]);
        return project;
    }

    public static collectClasses(typescriptProject: Project): ClassDeclaration[] {
        const project = typescriptProject;


        const allClasses: ClassDeclaration[] = [];
        project.getSourceFiles().forEach((typescriptFile) => {
            const baseName = typescriptFile.getBaseName();
            const skipPatterns = [
                '.spec.ts',
                '.enum.ts',
            ];
            const skipPaths = ['dist', 'rest-doc-extractor'];
            if (
                skipPatterns.some((pattern) => baseName.endsWith(pattern)) ||
                skipPaths.some((p) =>
                    typescriptFile.getFilePath().includes(p + '/'),
                )
            ) {
                console.info("Atlanıyor: " + baseName)
                return;
            }
            typescriptFile.getClasses().forEach((tsClass) => {
                console.info("Ekleniyor " + tsClass.getName())
                allClasses.push(tsClass);
            });
        });
        return allClasses;
    }

    public static isControllerClass(tsClass: ClassDeclaration): Decorator | null | undefined {
        return tsClass.getDecorator('Controller');
    }

    public static isModuleClass(tsClass: ClassDeclaration): Decorator | null | undefined {
        return tsClass.getDecorator('Module');
    }


    public static getControllerMethods(appModuleName: string, prefix: string, tsClass: ClassDeclaration): RestApiMethod[] {
        const parentPath = this.isControllerClass(tsClass)?.getArguments()?.at(0)?.getText()?.replace(/['"`]/g, '') ?? '';

        const methods: RestApiMethod[] = [];
        tsClass.getMethods().forEach((method) => {
            const methodDecorators = [
                method.getDecorator('Get'),
                method.getDecorator('Post'),
                method.getDecorator('Put'),
                method.getDecorator('Delete'),
            ].filter((a) => a);
            if (!methodDecorators || methodDecorators.length <= 0) return;
            // null ise voiddir
            let reqBody: RestObjectTypeInfo | null = null;
            const returnTypeRaw =
                TypescriptNestUtils.extractFromPromise(
                    method.getReturnType(),
                );
            const restMethodDecorator = methodDecorators[0];
            const queryParameters: RestPrimitiveTypeInfo[] = [];
            const pathParameters: RestPrimitiveTypeInfo[] = [];

            let methodType = restMethodDecorator!.getName();

            let restPath = TypescriptNestUtils.firstParameterAsString(
                restMethodDecorator,
            )
            console.info(restPath);
            method.getParameters().forEach((parameter) => {
                if (!parameter) return;
                const restParameterTypeName = parameter
                    .getDecorators()
                    .find((a) =>
                        ['Body', 'Query', 'Param'].includes(
                            a.getName(),
                        ),
                    )
                    ?.getName();

                if (!restParameterTypeName) {
                    console.error(
                        'Bilinmeyen parametre türü: ' +
                        parameter.getName() +
                        ' dekoratör bulunamadı',
                    );
                } else {
                    if (restParameterTypeName === 'Body') {
                        const bodyType = parameter
                            .getTypeNode()?.getType();
                        if (bodyType == null) {
                            console.error(
                                'Body parametresinin tipi bulunamadı: ' +
                                parameter.getName(),
                            );
                            return;
                        }
                        const typeText = inlineTypeText(
                            bodyType,
                            method,
                            {},
                        );
                        reqBody = {
                            typeNode: bodyType,
                            typeName:
                                bodyType
                                    .getSymbol()
                                    ?.getName() ??
                                bodyType.getText(),
                            importedFrom:
                                TypescriptNestUtils.findImportSource(
                                    bodyType,
                                ),
                            typeExpandedText: typeText,
                        };
                        console.info(
                            'Payload parametre: ' +
                            parameter.getName() +
                            ' tipi: ' +
                            parameter.getType().getText(),
                        );
                    }
                    else {
                        const extractedParameters =
                            TypescriptNestUtils.extractRestMethodPrimitiveParameterInfo(
                                parameter,
                            );
                        if (restParameterTypeName === 'Query') {
                            queryParameters.push(
                                ...extractedParameters,
                            );
                        } else if (
                            restParameterTypeName === 'Param'
                        ) {
                            pathParameters.push(
                                ...extractedParameters,
                            );
                        }
                    }
                }
            });
            //  returnType.getTypeNode().getType();
            const returnTypeInline = inlineTypeText(
                returnTypeRaw,
                method,
                { maxDepth: 1 },
            );
            const returnRestAp = {
                typeNode: returnTypeRaw,
                typeName:
                    ControllerScanner.returnTypeNameDetermination(
                        returnTypeRaw,
                    ),
                importedFrom:
                    TypescriptNestUtils.findImportSource(
                        returnTypeRaw,
                    ),
                typeExpandedText: returnTypeInline,
            };
            methods.push({
                methodType: methodType.toUpperCase() as
                    | 'GET'
                    | 'POST'
                    | 'PUT'
                    | 'DELETE',
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

        // Extend olan sınıf varsa onun REST metotlarını da topla (kalıtım zinciri boyunca)
        const baseClass = tsClass.getBaseClass();
        if (baseClass) {
            // Crud metotları NPMden aldığımız için anotasyonları vs. görmüyor (daha doğrusu derlenmiş halinde yok...) o yüzdne elle ekleyebiliriz napalım
            const baseClassFilePath = baseClass.getSourceFile().getFilePath();
            if (baseClassFilePath.includes("@ubs-platform") && baseClassFilePath.includes("base-crud-controller.d.ts")) {
                // BaseCrudController<MODEL, ID, INPUT, OUTPUT, SEARCH>
                // tsClass'ın extends ifadesinden type argümanlarını al
                const typeArgs = tsClass.getExtends()?.getTypeArguments() ?? [];
                // [0]=MODEL, [1]=ID, [2]=INPUT, [3]=OUTPUT, [4]=SEARCH
                const idType = typeArgs[1]?.getType() ?? null;
                const inputType = typeArgs[2]?.getType() ?? null;
                const outputType = typeArgs[3]?.getType() ?? null;
                const searchType = typeArgs[4]?.getType() ?? null;

                const makeTypeInfo = (type: Type | null, fallbackName: string): RestObjectTypeInfo => {
                    if (!type) return { typeNode: null, typeName: fallbackName, importedFrom: null, typeExpandedText: fallbackName };
                    const typeName = type.getSymbol()?.getName() ?? type.getText() ?? fallbackName;
                    const importedFrom = TypescriptNestUtils.findImportSource(type);
                    const typeExpandedText = inlineTypeText(type, null, { maxDepth: 1 });
                    return { typeNode: type, typeName, importedFrom, typeExpandedText };
                };

                const idPrimitive: RestPrimitiveTypeInfo[] = [{
                    parameterName: 'id',
                    typeNode: idType as any,
                    typeName: idType?.getText() ?? 'any',
                }];

                const searchProps: RestPrimitiveTypeInfo[] = searchType
                    ? TypescriptNestUtils.propertiesFromType(searchType)
                    : [];

                const inputInfo = makeTypeInfo(inputType, 'any');
                const outputInfo = makeTypeInfo(outputType, 'any');
                const outputArrayInfo: RestObjectTypeInfo = {
                    ...outputInfo,
                    typeName: outputInfo.typeName ? outputInfo.typeName + '[]' : 'any[]',
                    typeExpandedText: outputInfo.typeExpandedText + '[]',
                };
                const voidInfo: RestObjectTypeInfo = { typeNode: null, typeName: 'void', importedFrom: null, typeExpandedText: 'void' };

                methods.push(
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'fetchAll',
                        methodType: 'GET',
                        path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                        queryParameters: searchProps,
                        pathParameters: [],
                        requestBody: voidInfo,
                        responseType: outputArrayInfo,
                    },
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'search',
                        methodType: 'GET',
                        path: this.combineRestPath(prefix, parentPath, '_search').replace(/\\/g, '/'),
                        queryParameters: searchProps,
                        pathParameters: [],
                        requestBody: voidInfo,
                        responseType: outputInfo,
                    },
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'fetchOne',
                        methodType: 'GET',
                        path: this.combineRestPath(prefix, parentPath, ':id').replace(/\\/g, '/'),
                        queryParameters: [],
                        pathParameters: idPrimitive,
                        requestBody: voidInfo,
                        responseType: outputInfo,
                    },
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'add',
                        methodType: 'POST',
                        path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                        queryParameters: [],
                        pathParameters: [],
                        requestBody: inputInfo,
                        responseType: outputInfo,
                    },
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'edit',
                        methodType: 'PUT',
                        path: this.combineRestPath(prefix, parentPath, '').replace(/\\/g, '/'),
                        queryParameters: [],
                        pathParameters: [],
                        requestBody: inputInfo,
                        responseType: outputInfo,
                    },
                    {
                        applicationModuleName: appModuleName,
                        methodName: 'remove',
                        methodType: 'DELETE',
                        path: this.combineRestPath(prefix, parentPath, ':id').replace(/\\/g, '/'),
                        queryParameters: [],
                        pathParameters: idPrimitive,
                        requestBody: voidInfo,
                        responseType: voidInfo,
                    },
                );

                return methods;
            }
            // // /home/huseyin/dev/tk-ubs/postralmona/node_modules/@ubs-platform/crud-base/base-crud-controller.d.ts
            // // exec(`kdialog --msgbox 'Base class var ${baseClass.getSourceFile().getFilePath()}'`);
            const baseMethods = this.getControllerMethods(appModuleName, prefix, baseClass);

            // Alt sınıfta override edilmemiş metodları ekle
            for (const baseMethod of baseMethods) {
                if (!methods.some(m => m.methodName === baseMethod.methodName)) {
                    methods.push(baseMethod);
                }
            }
        }

        return methods;
    }

    public static extractControllerClassesFromModuleClass(
        tsClass: ClassDeclaration,
        allClasses: ClassDeclaration[] = [],
        maxDepth: number = 2,
        _visited: Set<string> = new Set(),
    ): ClassDeclaration[] {
        const controllerClasses: ClassDeclaration[] = [];
        const moduleDecorator = this.isModuleClass(tsClass);
        if (!moduleDecorator) return controllerClasses;

        // Döngüsel referansları önlemek için ziyaret edilen sınıfları takip et
        const className = tsClass.getName() ?? '';
        if (_visited.has(className)) return controllerClasses;
        _visited.add(className);

        const firstArg = moduleDecorator.getArguments()[0];
        // Eğer ilk argüman yoksa, ya da bir "{...}" yapısı değilse, controller bilgisi bulunamaz
        if (!firstArg || !firstArg.asKind(SyntaxKind.ObjectLiteralExpression)) return controllerClasses;
        const objLiteral = firstArg.asKind(SyntaxKind.ObjectLiteralExpression);
        if (!objLiteral) return controllerClasses;

        // controllers: [...] yapısını bul ve içindeki sınıf isimlerine göre controller sınıflarını bul
        const controllersProp = objLiteral
            .getProperty('controllers')
            ?.asKind(SyntaxKind.PropertyAssignment);
        if (controllersProp) {
            const arrayTypeInitializer = controllersProp.getInitializer()
                ?.asKind(SyntaxKind.ArrayLiteralExpression);
            if (arrayTypeInitializer) {
                arrayTypeInitializer.getElements().forEach(el => {
                    const text = el.getText();
                    // Önce allClasses içinde ara (farklı dosyalardaki controller'lar için), sonra aynı dosyaya bak
                    const foundClass = allClasses.find(c => c.getName() === text)
                        ?? tsClass.getSourceFile().getClass(text);
                    if (foundClass) {
                        controllerClasses.push(foundClass);
                    }
                });
            }
        }

        // imports: [...] yapısını bul, recursive olarak içe aktarılan modüllerdeki controllerları bul
        if (maxDepth > 0 && allClasses.length > 0) {
            const importsProp = objLiteral
                .getProperty('imports')
                ?.asKind(SyntaxKind.PropertyAssignment);
            if (importsProp) {
                const importsArray = importsProp.getInitializer()
                    ?.asKind(SyntaxKind.ArrayLiteralExpression);
                if (importsArray) {
                    importsArray.getElements().forEach(el => {
                        const moduleName = el.getText();
                        const moduleClass = allClasses.find(c => c.getName() === moduleName);
                        if (moduleClass) {
                            const controllersFromImport = this.extractControllerClassesFromModuleClass(
                                moduleClass, allClasses, maxDepth - 1, _visited,
                            );
                            controllerClasses.push(...controllersFromImport);
                        }
                    });
                }
            }
        }

        return controllerClasses;
    }

    public static collectControllerClassesFromModuleClasses(allClasses: ClassDeclaration[]) {
        const controllerClasses: ClassDeclaration[] = [];
        this.circulateControllerClassesFromModuleClasses(allClasses, allClasses, (controllerClass) => {
            if (!controllerClasses.includes(controllerClass)) {
                controllerClasses.push(controllerClass);
            }
        });
        return controllerClasses;
    }


    /**
     * @param moduleClasses  Modül sınıfları olarak dolaşılacak sınıflar (genellikle app-specific)
     * @param resolutionClasses  Controller ve import edilen modülleri aramak için kullanılacak tüm sınıflar (libs dahil)
     */
    public static circulateControllerClassesFromModuleClasses(
        moduleClasses: ClassDeclaration[],
        resolutionClasses: ClassDeclaration[],
        cb: (controllerClass: ClassDeclaration) => void,
    ) {
        for (let index = 0; index < moduleClasses.length; index++) {
            const tsClass = moduleClasses[index];
            if (!this.isModuleClass(tsClass)) {
                console.info("Bir modül değil, atlanıyor: ", tsClass.getName())
                continue;
            }
            console.info("İnceleniyor: ", tsClass.getName())
            const controllersInModule = this.extractControllerClassesFromModuleClass(tsClass, resolutionClasses);
            const extendedClass = tsClass.getBaseClass();
            if (extendedClass) {
                const controllersInExtendedModule = this.extractControllerClassesFromModuleClass(extendedClass, resolutionClasses);
                controllersInExtendedModule.forEach(c => {
                    const controllerDecorator = this.isControllerClass(c);
                    if (!controllerDecorator) {
                        console.info("Bir controller değil: " + c.getName())
                        return;
                    }
                    cb(c);
                });
            }
            controllersInModule.forEach(c => {
                if (!this.isControllerClass(c)) {
                    console.info("Bir controller değil: " + c.getName())
                    return;
                }
                cb(c);
            });
        }
    }



    private static returnTypeNameDetermination(returnTypeRaw: Type): string {
        if (returnTypeRaw.isArray()) {
            const arrayElementType = returnTypeRaw.getArrayElementType();
            if (arrayElementType) {
                return (
                    ControllerScanner.returnTypeNameDetermination(
                        arrayElementType,
                    ) + '[]'
                );
            } else {
                return 'any[]';
            }
        } else if (returnTypeRaw.isUnion()) {
            return returnTypeRaw
                .getUnionTypes()
                .map((t) => ControllerScanner.returnTypeNameDetermination(t))
                .join(' | ');
        } else if (returnTypeRaw.isIntersection()) {
            return returnTypeRaw
                .getIntersectionTypes()
                .map((t) => ControllerScanner.returnTypeNameDetermination(t))
                .join(' & ');
        } else if (returnTypeRaw.isAnonymous()) {
            return inlineTypeText(returnTypeRaw, null, { maxDepth: 1 });
        } else if (returnTypeRaw.isString()) {
            return 'string';
        } else if (returnTypeRaw.isNumber()) {
            return 'number';
        } else if (returnTypeRaw.isBoolean()) {
            return 'boolean';
        } else if (returnTypeRaw.isUndefined()) {
            return 'undefined';
        }
        const typeArgs = returnTypeRaw.getTypeArguments();
        let tsArgsStr = '';
        if (typeArgs.length) {
            tsArgsStr =
                '<' +
                typeArgs
                    .map((t) =>
                        ControllerScanner.returnTypeNameDetermination(t),
                    )
                    .join(', ') +
                '>';
        }
        return (
            (returnTypeRaw.getSymbol()?.getName() ?? returnTypeRaw.getText()) +
            tsArgsStr
        );
    }

    private static extractGlobalPrefixFromSourceFile(sourceFileText: string): string {
        // exec(`kdialog --msgbox 'Global prefix aranıyor... Gelen metin uzunluğu: ${sourceFileText.length}'`);
        const capturedGlobalPrefix =
            /globalPrefix\s*=\s*"(.*)"|globalPrefix\s*=\s*'(.*)'|\.setGlobalPrefix\(('.*')\)|\.setGlobalPrefix\("(.*)"\)/g.exec(
                sourceFileText,
            );
        if (capturedGlobalPrefix) {
            return capturedGlobalPrefix[1] ||
                capturedGlobalPrefix[2] ||
                capturedGlobalPrefix[3] ||
                '';
        }
        // exec(`kdialog --msgbox 'Global prefix bulunamadı, varsayılan olarak boş kabul edilecek.'`);
        return '';
    }

    public static async scanAllControllers(mainPath: string) {
        const methodsMappedByApp: Record<string, RestApiCollection[]> = {};
        const appsPath = path.join(mainPath, 'apps');
        const appList = await DirectoryUtil.listFolderNamesNoRecursive(appsPath);
        const rootProject = this.getTypescriptRootProject(mainPath);
        // Tüm sınıfları bir kez topla (libs dahil) — module resolution için kullanılır
        const allProjectClasses = this.collectClasses(rootProject);

        for (let index = 0; index < appList.length; index++) {
            const appName = appList[index];
            console.info('Scanning application: ' + appName);
            let globalPrefix = '';
            // const methods: RestApiMethod[] = [];
            const collections: RestApiCollection[] = [];
            // Sadece bu uygulamaya ait sınıflar — modül iterasyonu için
            const appClasses = allProjectClasses.filter(
                a => a.getSourceFile().getFilePath().includes(path.join('apps', appName, 'src')),
            );

            // global prefix'i main.ts source file text'inden bul (main.ts'de class olmaz)
            const mainSourceFile = rootProject.getSourceFiles().find(
                sf => sf.getFilePath().includes(path.join('apps', appName, 'src', 'main.ts'))
            );
            if (mainSourceFile) {
                globalPrefix = this.extractGlobalPrefixFromSourceFile(mainSourceFile.getFullText());
                // exec(`kdialog --msgbox 'Global prefix aranıyor: ${mainSourceFile.getFilePath()} bulundu: ${globalPrefix}'`);
            }
            // exec(`kdialog --msgbox 'Uygulama: ${appName} için controllerlar taranıyor. Global prefix: ${globalPrefix}'`);
            // Modülleri app sınıflarında iterate et, controller/import aramasını tüm proje sınıflarında yap
            this.circulateControllerClassesFromModuleClasses(appClasses, allProjectClasses, (controllerClass) => {
                collections.push({
                    methods: this.getControllerMethods(appName, globalPrefix, controllerClass),
                    name: controllerClass.getName() || "unnamed",
                    parentPath: ""
                })
            });
            if (methodsMappedByApp[appName] == null) {
                methodsMappedByApp[appName] = [];
            }

            methodsMappedByApp[appName].push(...collections);
        }

        console.log("Çıkış: ", methodsMappedByApp)
        return methodsMappedByApp;

    }

    public static combineRestPath(...segments: string[]) {
        return segments
            .filter(p => p && p.trim() !== '')
            .map(p => p.replace(/^\/|\/$/g, '')) // Baş ve sondaki slash'leri kaldır
            .join('/');
    }

}
