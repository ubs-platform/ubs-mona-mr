import { RestApiCollection } from "rest-doc-extractor/parser/api.data";
export declare class NgxServiceFileGenerator {
    static generateServiceClassStr(workDir: string, libraryPackageName: string, controller: RestApiCollection): string;
    static saveServiceToPath(workDir: string, libraryPackageName: string, savingPathPrefix: string, controller: RestApiCollection): Promise<void>;
    static generateAndSaveServices(workDir: string, libraryPackageName: string, savingPathPrefix: string, controllers: RestApiCollection[]): Promise<void>;
}
