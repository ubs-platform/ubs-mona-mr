import * as ts from 'typescript'; // Import will be elided as long as we only use types from it, so we don't have the compiler code  loaded at runtime

export type CompilerOptions = typeof ts.parseCommandLine extends (
    ...args: any[]
) => infer TResult
    ? TResult extends { options: infer TOptions }
        ? TOptions
        : never
    : never;
export type TypeAcquisition = typeof ts.parseCommandLine extends (
    ...args: any[]
) => infer TResult
    ? TResult extends { typeAcquisition?: infer TTypeAcquisition }
        ? TTypeAcquisition
        : never
    : never;

export interface TypescriptConfiguration {
    compilerOptions: CompilerOptions;
    exclude: string[];
    compileOnSave: boolean;
    extends: string;
    files: string[];
    include: string[];
    typeAcquisition: TypeAcquisition;
}
