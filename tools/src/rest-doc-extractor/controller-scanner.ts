import { join } from 'path';
import { Project } from 'ts-morph';
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

export class ControllerScanner {
    public static scanAllControllers(mainPath: string) {
        const collectionsByProject: { [key: string]: RestApiCollection[] } = {};

        const project = new Project({
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
            if (
                skipPatterns.some((pattern) => baseName.endsWith(pattern)) ||
                skipPaths.some((p) =>
                    typescriptFile.getFilePath().includes(p + '/'),
                )
            ) {
                return;
            }
            mainPath + '/**/*.ts';

            const appNameRegex = /apps\/([^\/]+)\/src/,
                libNameRegex = /libs\/([^\/]+)\/src/;
            const appMatch = typescriptFile.getFilePath().match(appNameRegex),
                libMatch = typescriptFile.getFilePath().match(libNameRegex);
            let projectName = 'unknown';
            if (appMatch || libMatch) {
                projectName = (appMatch ? appMatch[1] : libMatch[1]).replace(
                    /[^a-zA-Z0-9]/g,
                    '-',
                );
            } else {
                projectName = 'root-' + randomUUID().slice(0, 4);
            }
            if (!collectionsByProject[projectName]) {
                collectionsByProject[projectName] = [];
            }
            const collectionsForThisProject = collectionsByProject[projectName];

            const filePath = typescriptFile.getFilePath();
            console.info('Dosya: ' + filePath);
            // const collection : RestApiCollection = {
            //     methods:
            // }

            typescriptFile.getClasses().forEach((tsClass) => {
                const itIsController = tsClass.getDecorator('Controller');

                if (itIsController) {
                    let parentPath =
                        TypescriptNestUtils.firstParameterAsString(
                            itIsController,
                        );

                    console.debug(tsClass.getName() + ' bir controller');
                    const methods: RestApiMethod[] = [];
                    tsClass.getMethods().forEach((method) => {
                        const methodDecorators = [
                            method.getDecorator('Get'),
                            method.getDecorator('Post'),
                            method.getDecorator('Put'),
                            method.getDecorator('Delete'),
                        ].filter((a) => a);
                        if (methodDecorators[0]) {
                            let reqBody: RestObjectTypeInfo;
                            const returnTypeRaw =
                                TypescriptNestUtils.extractFromPromise(
                                    method.getReturnType(),
                                );
                            const restMethodDecorator = methodDecorators[0];
                            const queryParameters: RestPrimitiveTypeInfo[] = [];
                            const pathParameters: RestPrimitiveTypeInfo[] = [];
                            // const restQueryResponse: RestApiMethod = null;
                            let methodType = restMethodDecorator.getName();

                            let path = join(
                                parentPath,
                                TypescriptNestUtils.firstParameterAsString(
                                    restMethodDecorator,
                                ),
                            );
                            console.info(path);
                            method.getParameters().forEach((parameter) => {
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
                                            .getTypeNode()
                                            .getType();
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
                                    } else {
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
                                    ControllerScanner.returnTypeNameDetermination(returnTypeRaw),
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
                                path: path,
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
        return collectionsByProject;
    }

    private static returnTypeNameDetermination(returnTypeRaw) {
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
                .map((t) =>
                    ControllerScanner.returnTypeNameDetermination(t),
                )
                .join(' | ');
        } else if (returnTypeRaw.isIntersection()) {
            return returnTypeRaw
                .getIntersectionTypes()
                .map((t) =>
                    ControllerScanner.returnTypeNameDetermination(t),
                )
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
        let tsArgsStr = "";
        if (typeArgs.length) {
            tsArgsStr = (
                '<' +
                typeArgs
                    .map((t) =>
                        ControllerScanner.returnTypeNameDetermination(t),
                    )
                    .join(', ') +
                '>'
            );
        }
        return (returnTypeRaw.getSymbol()?.getName() ??
            returnTypeRaw.getText()) + tsArgsStr;
    }
}
