export interface IAction {
    info: string;
    action: (...workingDirectoryAndParameters: string[]) => Promise<void>;
}
