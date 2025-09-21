export declare class NamingUtil {
    static toCamelCase(...parts: string[]): string;
    static toKebabCase(...parts: string[]): string;
    static kebabToCamel(kebab: string): string;
    static snakeToCamel(snake: string): string;
    static camelOrPascalToSnake(camel: string): string;
    static camelOrPascalToKebab(camel: string): string;
}
