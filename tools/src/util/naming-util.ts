export class NamingUtil {
    static toCamelCase(...parts: string[]): string {
        if (parts.length === 0) return '';
        return parts[0].charAt(0).toLowerCase() + parts[0].slice(1) + parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }

    static toKebabCase(...parts: string[]): string {
        return parts.map(part => part.toLowerCase()).join('-');
    }

    static kebabToCamel(kebab: string): string {
        return kebab.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }

    static snakeToCamel(snake: string): string {
        return snake.split('_').map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }

    static camelOrPascalToSnake(camel: string): string {
        return camel.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }

    static camelOrPascalToKebab(camel: string): string {
        return camel.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

}