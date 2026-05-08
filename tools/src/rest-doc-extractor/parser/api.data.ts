// import { TypeLiteralNode, SourceFile } from "ts-morph";
// import * as Typescript from "typescript"
import * as TsMorph from "ts-morph"
export interface RestPrimitiveTypeInfo {
  parameterName: string;
  typeNode: TsMorph.Type,
  typeName: string;
  
}

export interface RestObjectTypeInfo {
  // parameterName: string;
  typeNode: TsMorph.Type | null,
  typeName: string | null;
  importedFrom: string | null;
  typeExpandedText: string;
}

export interface RestApiMethod {
  path: string;
  applicationModuleName: string;
  methodName: string;
  methodType: string; // "Get" | "Put" | "Delete" | "Post";
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

// export type ConvertOptions = {
//   typeLiteral: TypeLiteralNode;
//   sourceFile: SourceFile;
//   name?: string; // interface adı; verilmezse otomatik üretilir
//   isExported?: boolean; // default: true
//   save?: boolean; // interface eklendikten sonra dosyayı kaydet (async)
// };
