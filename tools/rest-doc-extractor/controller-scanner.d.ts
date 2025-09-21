import { RestApiCollection } from './parser/api.data.js';
export declare class ControllerScanner {
    static scanAllControllers(mainPath: string): {
        [key: string]: RestApiCollection[];
    };
    private static returnTypeNameDetermination;
}
