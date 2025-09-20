import * as ts from 'typescript';
export type CompilerOptions = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ? TResult extends {
    options: infer TOptions;
} ? TOptions : never : never;
export type TypeAcquisition = typeof ts.parseCommandLine extends (...args: any[]) => infer TResult ? TResult extends {
    typeAcquisition?: infer TTypeAcquisition;
} ? TTypeAcquisition : never : never;
export interface TypescriptConfiguration {
    compilerOptions: CompilerOptions;
    exclude: string[];
    compileOnSave: boolean;
    extends: string;
    files: string[];
    include: string[];
    typeAcquisition: TypeAcquisition;
}
