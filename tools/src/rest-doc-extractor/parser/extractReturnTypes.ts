// tools/extractReturnTypes.ts
import {
  Project,
  SyntaxKind,
  ts,
  MethodDeclaration,
  Type,
  Node,
  Symbol as MorphSymbol,
} from "ts-morph";

type InlineOpts = {
  maxDepth?: number; // default: 2
  unwrapPromises?: boolean; // default: false
  includePrivate?: boolean; // default: false
  flags?: ts.TypeFormatFlags; // default: ts.TypeFormatFlags.NoTruncation
};

export function inlineTypeText(
  type: Type,
  ctxNode: Node,
  opts: InlineOpts = {}
): string {
  const {
    maxDepth = 2,
    unwrapPromises = false,
    includePrivate = false,
    flags = ts.TypeFormatFlags.NoTruncation,
  } = opts;

  const seen = new Set<Type>(); // döngüsel tipleri önlemek için

  function go(t: Type, depth: number): string {
    if (unwrapPromises) {
      const awaited = t.getAwaitedType();
      if (awaited) t = awaited;
    }
    if (t.isString() || t.isNumber() || t.isBoolean() || t.isUndefined() || t.isNull() || t.isEnumLiteral() || t.isEnum() || t.isStringLiteral() || t.isNumberLiteral() || t.isBooleanLiteral()) {
      return t.getText(ctxNode, flags);
    }
    // Derinlik biterse normal getText
    if (depth < 0) return t.getText(ctxNode, flags);

    // Union / Intersection
    if (t.isUnion())
      return t
        .getUnionTypes()
        .map((u) => go(u, depth))
        .join(" | ");
    if (t.isIntersection())
      return t
        .getIntersectionTypes()
        .map((i) => go(i, depth))
        .join(" & ");

    // Array / Tuple
    if (t.isArray()) {
      const elem = t.getArrayElementType() ?? t; // korunmalı yaklaşım
      const inner = go(elem, depth - 1);
      // Tercihen `T[]` yazalım (basitlik)
      return `${inner}[]`;
    }
    if (t.isTuple()) {
      const elems = t.getTupleElements().map((e) => go(e, depth - 1));
      return `[${elems.join(", ")}]`;
    }

    // Döngü yakalama
    if (seen.has(t)) return t.getText(ctxNode, flags);
    seen.add(t);

    // Sınıf / interface / type alias gibi adlı tiplerde özellikleri açalım
    const sym: MorphSymbol | undefined = t.getSymbol() ?? t.getAliasSymbol();
    const decls = sym?.getDeclarations() ?? [];
    const isClassOrInterface = decls.some(
      (d) =>
        d.getKind() === SyntaxKind.ClassDeclaration ||
        d.getKind() === SyntaxKind.InterfaceDeclaration
    );

    // Object literal tipler zaten açılır; sınıf/interface'leri de açalım
    if (t.isObject() || (isClassOrInterface || !sym)) {
      // Method signature'ları atlayıp, alanları toplayalım
      const props = t.getProperties();

      // Sadece property olanları al (methodları elemek için)
      const fields = props.filter((p) => {
        const decl = p.getValueDeclaration();
        if (!decl) return true; // emin değilsek dahil et
        const k = decl.getKind();
        const isField =
          k === SyntaxKind.PropertySignature ||
          k === SyntaxKind.PropertyDeclaration ||
          k === SyntaxKind.PropertyAssignment ||
          k === SyntaxKind.Parameter; // public field param props

        if (!isField) return false;

        if (!includePrivate) {
          // private/protected filtrele
          // (PropertyDeclaration ise modifier bak; yoksa public varsay)
          // Not: interface tarafında private/protected olmaz.
          // getModifiers() ts-morph v17+ için.
          const anyDecl: any = decl as any;
          const hasPrivate = anyDecl.hasModifier?.(SyntaxKind.PrivateKeyword);
          const hasProtected = anyDecl.hasModifier?.(
            SyntaxKind.ProtectedKeyword
          );
          if (hasPrivate || hasProtected) return false;
        }

        return true;
      });

      // Eğer hiç alan yoksa, fallback: normal yaz
      if (fields.length === 0) return t.getText(ctxNode, flags);

      const parts = fields.map((p) => {
        const name = p.getName();
        const valueDecl =
          p.getValueDeclaration() ?? p.getDeclarations()[0] ?? ctxNode;
        const pt = p.getTypeAtLocation(valueDecl);
        const piece = go(pt, depth - 1);
        return `${name}: ${piece};`;
      });

      return `{ ${parts.join(" ")} }`;
    }

    // Function tipi (metot tipi olarak yakalanırsa)
    if (t.getCallSignatures().length) {
      const sig = t.getCallSignatures()[0];
      const params = sig
        .getParameters()
        .map((sp, i) => {
          const pd = sp.getDeclarations()[0] ?? ctxNode;
          const pt = sp.getTypeAtLocation(pd);
          return `arg${i}: ${go(pt, depth - 1)}`;
        })
        .join(", ");
      const ret = go(sig.getReturnType(), depth - 1);
      return `(${params}) => ${ret}`;
    }

    // Diğer her şey için default yazım
    return t.getText(ctxNode, flags);
  }

  return go(type, maxDepth);
}



type Options = {
  unwrapPromises: boolean;
  includePrivate: boolean;
};

function parseArgs(): { globs: string[]; opts: Options } {
  const globs: string[] = [];
  const opts: Options = { unwrapPromises: false, includePrivate: false };

  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--unwrap-promises" || a === "-u") opts.unwrapPromises = true;
    else if (a === "--include-private" || a === "-p")
      opts.includePrivate = true;
    else globs.push(a);
  }
  return { globs, opts };
}

function typeText(type: Type, ctxNode: MethodDeclaration): string {
  // Bazı durumlarda daha okunur metin için TypeScript bayrakları işe yarar.
  // Gerekirse flags ekleyebilirsiniz.
  return type.getText(
    ctxNode,
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.UseFullyQualifiedType |
    ts.TypeFormatFlags.WriteArrowStyleSignature
  );
}

function maybeUnwrapPromise(type: Type): Type {
  // Async metotlarda Promise<T> → T olarak görmek isterseniz:
  const awaited = type.getAwaitedType();
  return awaited ?? type;
}

function isVisible(m: MethodDeclaration, includePrivate: boolean): boolean {
  if (includePrivate) return true;
  return !m.hasModifier(SyntaxKind.PrivateKeyword);
}

function printRow(
  kind: "class" | "method" | "overload" | "fn",
  cols: string[]
) {
  const prefix =
    kind === "class"
      ? "🏛️ "
      : kind === "method"
        ? "  ├─ "
        : kind === "overload"
          ? "  │  ↳ "
          : "• ";
  console.log(prefix + cols.join("  |  "));
}

// async function main() {
//   const { globs, opts } = parseArgs();

//   const project = new Project({
//     tsConfigFilePath: "tsconfig.json",
//     skipAddingFilesFromTsConfig: false,
//   });

//   if (globs.length > 0) {
//     // Ekstra glob/dosya verildiyse projeye ekle
//     project.addSourceFilesAtPaths(globs);
//   }

//   // Derleme hataları olsa da tip bilgisi çoğunlukla alınabilir;
//   // ama isterseniz kontrol edip uyarı basabilirsiniz:
//   const diags = project.getPreEmitDiagnostics();
//   if (diags.length) {
//     console.warn(
//       `⚠️  ${diags.length} TypeScript uyarısı/hatası var (tip çıkarımı yine yapılır).`
//     );
//   }

//   const sfList = project
//     .getSourceFiles()
//     .filter((sf) => !sf.isDeclarationFile());

//   for (const sf of sfList) {
//     const classes = sf.getClasses();
//     const fns = sf.getFunctions(); // üst seviye fonksiyonları da eklemek isterseniz

//     if (classes.length === 0 && fns.length === 0) continue;

//     console.log(`\n📄 ${sf.getFilePath()}`);

//     // Sınıflar ve metotları
//     for (const cls of classes) {
//       printRow("class", [cls.getName() ?? "(isimsiz sınıf)"]);

//       const methods = cls
//         .getMethods()
//         .filter((m) => isVisible(m, opts.includePrivate));
//       if (methods.length === 0) {
//         printRow("method", ["(metot yok)"]);
//         continue;
//       }

//       for (const m of methods) {
//         // Overload desteği: önce imza(lar), sonra implementasyon
//         const overloads = m.getOverloads();
//         if (overloads.length > 0) {
//           overloads.forEach((ov, idx) => {
//             let t = ov.getReturnType();
//             if (opts.unwrapPromises) t = maybeUnwrapPromise(t);
//             const text = typeText(t, ov);
//             printRow("overload", [`${m.getName()}#${idx + 1}()`, `→ ${text}`]);
//           });
//         }

//         // Implementasyon
//         let rt = m.getReturnType();
//         if (opts.unwrapPromises) rt = maybeUnwrapPromise(rt);
//         // const txt = typeText(rt, m);
//         const txt = inlineTypeText(rt, m, {
//           maxDepth: 5,
//           unwrapPromises: false,
//           includePrivate: false,
//           flags: ts.TypeFormatFlags.NoTruncation,
//         });

//         const modifiers = [
//           m.hasModifier(SyntaxKind.StaticKeyword) ? "static" : "",
//           m.hasModifier(SyntaxKind.PrivateKeyword) ? "private" : "",
//           m.isAsync() ? "async" : "",
//         ]
//           .filter(Boolean)
//           .join(" ");

//         const sig = `${m.getName()}(${m
//           .getParameters()
//           .map((p) => p.getName())
//           .join(", ")})`;
//         printRow("method", [
//           modifiers ? `[${modifiers}] ${sig}` : sig,
//           `→ ${txt}`,
//         ]);
//       }
//     }

//     // Üst seviye fonksiyonlar (opsiyonel ama bazen faydalı)
//     for (const fn of fns) {
//       let rt = fn.getReturnType();
//       if (opts.unwrapPromises) rt = maybeUnwrapPromise(rt);
//       const txt = typeText(rt, fn as any);
//       printRow("fn", [`function ${fn.getName() ?? "(anon)"}`, `→ ${txt}`]);
//     }
//   }
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
