export declare class JsonUtil {
    static readJson<T>(...paths: string[]): Promise<T>;
    static writeJson(obj: any, ...paths: string[]): Promise<void>;
}
