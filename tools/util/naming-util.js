"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamingUtil = void 0;
class NamingUtil {
    static toCamelCase(...parts) {
        if (parts.length === 0)
            return '';
        return parts[0].charAt(0).toLowerCase() + parts[0].slice(1) + parts.slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }
    static toKebabCase(...parts) {
        return parts.map(part => part.toLowerCase()).join('-');
    }
    static kebabToCamel(kebab) {
        return kebab.split('-').map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }
    static snakeToCamel(snake) {
        return snake.split('_').map((part, index) => index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)).join('');
    }
    static camelOrPascalToSnake(camel) {
        return camel.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }
    static camelOrPascalToKebab(camel) {
        return camel.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
}
exports.NamingUtil = NamingUtil;
//# sourceMappingURL=naming-util.js.map