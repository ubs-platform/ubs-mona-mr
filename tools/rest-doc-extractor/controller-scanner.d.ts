import { ClassDeclaration, Decorator, Project } from 'ts-morph';
import { RestApiCollection, RestApiMethod } from './parser/api.data.js';
export declare class ControllerScanner {
    static getTypescriptRootProject(mainPath: string): Project;
    static collectClasses(typescriptProject: Project): ClassDeclaration[];
    static isControllerClass(tsClass: ClassDeclaration): Decorator | null | undefined;
    static isModuleClass(tsClass: ClassDeclaration): Decorator | null | undefined;
    static getControllerMethods(appModuleName: string, prefix: string, tsClass: ClassDeclaration): RestApiMethod[];
    static extractControllerClassesFromModuleClass(tsClass: ClassDeclaration, allClasses?: ClassDeclaration[], maxDepth?: number, _visited?: Set<string>): ClassDeclaration[];
    static collectControllerClassesFromModuleClasses(allClasses: ClassDeclaration[]): ClassDeclaration[];
    static circulateControllerClassesFromModuleClasses(moduleClasses: ClassDeclaration[], resolutionClasses: ClassDeclaration[], cb: (controllerClass: ClassDeclaration) => void): void;
    private static returnTypeNameDetermination;
    private static extractGlobalPrefixFromSourceFile;
    static scanAllControllers(mainPath: string): Promise<Record<string, RestApiCollection[]>>;
    static combineRestPath(...segments: string[]): string;
}
