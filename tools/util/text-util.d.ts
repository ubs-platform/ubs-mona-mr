export type ReplaceInstruction = string | null | undefined;
export type StringByFilePathCallbk = (filePath: string) => ReplaceInstruction;
export interface TextFoundItem {
    path: string;
    found: RegExpExecArray;
}
export interface ReplaceTextRecipe {
    finding: string;
    replaceWith: ReplaceInstruction | StringByFilePathCallbk;
}
export declare class TextUtil {
    static replaceText(path: string, replaceTextRecipes: ReplaceTextRecipe[]): Promise<void>;
    static findByRegex(path: string, findings: RegExp[]): Promise<Map<RegExp, TextFoundItem[]>>;
}
