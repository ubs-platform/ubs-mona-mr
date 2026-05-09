export declare class RestApiDocGen {
    static generate(): Promise<void>;
    private static renderAppMarkdown;
    private static renderMethodMarkdown;
    static formatExpandedText(typeExpandedText: string): string;
    private static safeTypeName;
}
