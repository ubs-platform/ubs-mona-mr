export declare class DirectoryUtil {
    static listAllFiles(folderPath: string): Promise<string[]>;
    static ensureDirectory(...filePath: string[]): Promise<void>;
    static directoryExists(...filePath: string[]): Promise<boolean>;
    static circulateFilesRecursive(folderPath: string, fileAction: (fileName: string) => PromiseLike<void> | void): Promise<void>;
}
