import * as TsMorph from "ts-morph";
export interface RestPrimitiveTypeInfo {
    parameterName: string;
    typeNode: TsMorph.Type;
    typeName: string;
}
export interface RestObjectTypeInfo {
    typeNode: TsMorph.Type | null;
    typeName: string | null;
    importedFrom: string | null;
    typeExpandedText: string;
}
export interface RestApiMethod {
    path: string;
    applicationModuleName: string;
    methodName: string;
    methodType: string;
    description?: string;
    responseType?: RestObjectTypeInfo;
    queryParameters: RestPrimitiveTypeInfo[];
    pathParameters: RestPrimitiveTypeInfo[];
    requestBody?: RestObjectTypeInfo;
}
export interface RestApiCollection {
    methods: RestApiMethod[];
    name: string;
    parentPath: string;
}
