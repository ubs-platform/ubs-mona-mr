import { ParameterDeclaration, SourceFile, StringLiteral, Symbol, Type } from "ts-morph";
import { RestPrimitiveTypeInfo } from "./api.data.js";
import { ts } from "ts-morph";

export class TypescriptNestUtils {



  // Return Type
  // method.getReturnType()
  public static extractFromPromise(t: Type) {
    const returnTypeName = t.getSymbol()?.getName()
    if (returnTypeName == "Promise") {
      return t.getTypeArguments()[0];
    } else {
      return t;
    }
  }

  static findImportSource(type: Type<ts.Type>): string {
    let importedFrom: string | undefined;

    const symbol: Symbol | undefined = type.getSymbol();
    if (symbol) {
      const decl = symbol.getDeclarations()?.[0];
      if (decl) {
        const sourceFile = decl.getSourceFile();
        if (!sourceFile.isFromExternalLibrary()) {
          importedFrom = sourceFile.getFilePath();
        } else {
          importedFrom = sourceFile.getBaseNameWithoutExtension();
        }
      }
    }

    return importedFrom || "";
  }

  public static extractRestMethodPrimitiveParameterInfo(
    param: ParameterDeclaration
  ): RestPrimitiveTypeInfo[] {
    const name = param.getName();
    const type = param.getType();

    // Eğer TypeLiteral ise
    if
      (type.isObject() &&
      type.isAnonymous() &&
      param.getTypeNode()?.getKindName() === "TypeLiteral") {

      return TypescriptNestUtils.propertiesFromType(type);
    }

    if ((param.getTypeNode()?.getKindName() === "TypeReference")) {
      return TypescriptNestUtils.propertiesFromType(param.getTypeNode().getType());

    }

    // Normal primitive veya referans tip
    const typeName = type.getText();
    this.findImportSource(type);

    return [
      {
        // isLiteral: false,
        parameterName: name,
        typeNode: type,
        typeName: typeName
      },
    ];
  }

  private static propertiesFromType(type) {
    const properties = type.getProperties();
    return properties.map((prop) => {
      const propName = prop.getName();
      const propType = prop.getValueDeclaration()?.getType();

      let importedFrom: string | undefined;
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

  public static firstParameterAsString(restMethodDecorator) {
    const firstParam = restMethodDecorator.getArguments()[0];
    let path = "";
    if (firstParam instanceof StringLiteral) {
      path = firstParam.getLiteralValue();
    }
    return path;
  }

}
