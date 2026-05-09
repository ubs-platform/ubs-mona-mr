import { Decorator, ParameterDeclaration, Type } from "ts-morph";
import { RestPrimitiveTypeInfo } from "./api.data.js";
import { ts } from "ts-morph";
export declare class TypescriptNestUtils {
    static extractFromPromise(t: Type): Type<ts.Type>;
    static findImportSource(type: Type<ts.Type>): string;
    static extractRestMethodPrimitiveParameterInfo(param: ParameterDeclaration): RestPrimitiveTypeInfo[];
    static propertiesFromType(type: any): any;
    private static pathRelativeToRootProject;
    static firstParameterAsString(restMethodDecorator: Decorator): string;
}
