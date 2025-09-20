"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypescriptNestUtils = void 0;
const ts_morph_1 = require("ts-morph");
class TypescriptNestUtils {
    static extractFromPromise(t) {
        const returnTypeName = t.getSymbol()?.getName();
        if (returnTypeName == "Promise") {
            return t.getTypeArguments()[0];
        }
        else {
            return t;
        }
    }
    static findImportSource(type) {
        let importedFrom;
        const symbol = type.getSymbol();
        if (symbol) {
            const decl = symbol.getDeclarations()?.[0];
            if (decl) {
                const sourceFile = decl.getSourceFile();
                if (!sourceFile.isFromExternalLibrary()) {
                    importedFrom = sourceFile.getFilePath();
                }
                else {
                    importedFrom = sourceFile.getBaseNameWithoutExtension();
                }
            }
        }
        return importedFrom || "";
    }
    static extractRestMethodPrimitiveParameterInfo(param) {
        const name = param.getName();
        const type = param.getType();
        if (type.isObject() &&
            type.isAnonymous() &&
            param.getTypeNode()?.getKindName() === "TypeLiteral") {
            return TypescriptNestUtils.propertiesFromType(type);
        }
        if ((param.getTypeNode()?.getKindName() === "TypeReference")) {
            return TypescriptNestUtils.propertiesFromType(param.getTypeNode().getType());
        }
        const typeName = type.getText();
        this.findImportSource(type);
        return [
            {
                parameterName: name,
                typeNode: type,
                typeName: typeName
            },
        ];
    }
    static propertiesFromType(type) {
        const properties = type.getProperties();
        return properties.map((prop) => {
            const propName = prop.getName();
            const propType = prop.getValueDeclaration()?.getType();
            let importedFrom;
            if (propType) {
                const symbol = propType.getSymbol();
                if (symbol) {
                    const decl = symbol.getDeclarations()[0];
                    if (decl) {
                        const sourceFile = decl.getSourceFile();
                        if (!sourceFile.isFromExternalLibrary()) {
                            importedFrom = sourceFile.getFilePath();
                        }
                    }
                }
            }
            return {
                importedFrom: importedFrom || "",
                parameterName: propName,
                typeNode: propType,
                typeName: propType.getText(),
            };
        });
    }
    static firstParameterAsString(restMethodDecorator) {
        const firstParam = restMethodDecorator.getArguments()[0];
        let path = "";
        if (firstParam instanceof ts_morph_1.StringLiteral) {
            path = firstParam.getLiteralValue();
        }
        return path;
    }
}
exports.TypescriptNestUtils = TypescriptNestUtils;
//# sourceMappingURL=typescript-utils.js.map