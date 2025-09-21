import * as TsMorph from "ts-morph";
export interface RestPrimitiveTypeInfo {
    parameterName: string;
    typeNode: TsMorph.Type;
    typeName: string;
}
export interface RestObjectTypeInfo {
    typeNode: TsMorph.Type;
    typeName: string;
    importedFrom: string;
    typeExpandedText: string;
}
export interface RestApiMethod {
    path: string;
    methodName: string;
    methodType: string;
    responseType?: RestObjectTypeInfo;
    queryParameters: RestPrimitiveTypeInfo[];
    pathParameters: RestPrimitiveTypeInfo[];
    requestBody: RestObjectTypeInfo;
}
export interface RestApiCollection {
    methods: RestApiMethod[];
    name: string;
    parentPath: string;
}
