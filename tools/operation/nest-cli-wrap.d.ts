export declare class NestJsCliWrap {
    private workingDirectory;
    constructor(workingDirectory: string);
    checkPrefixIsSame(): Promise<void>;
    private readConfig;
    extendLib(libPath: string): Promise<void>;
}
