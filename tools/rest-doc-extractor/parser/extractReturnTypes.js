"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inlineTypeText = inlineTypeText;
const ts_morph_1 = require("ts-morph");
function inlineTypeText(type, ctxNode, opts = {}) {
    const { maxDepth = 2, unwrapPromises = false, includePrivate = false, flags = ts_morph_1.ts.TypeFormatFlags.NoTruncation, } = opts;
    const seen = new Set();
    function go(t, depth) {
        if (unwrapPromises) {
            const awaited = t.getAwaitedType();
            if (awaited)
                t = awaited;
        }
        if (t.isString() || t.isNumber() || t.isBoolean() || t.isUndefined() || t.isNull() || t.isEnumLiteral() || t.isEnum() || t.isStringLiteral() || t.isNumberLiteral() || t.isBooleanLiteral()) {
            return t.getText(ctxNode, flags);
        }
        if (depth < 0)
            return t.getText(ctxNode, flags);
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
        if (t.isArray()) {
            const elem = t.getArrayElementType() ?? t;
            const inner = go(elem, depth - 1);
            return `${inner}[]`;
        }
        if (t.isTuple()) {
            const elems = t.getTupleElements().map((e) => go(e, depth - 1));
            return `[${elems.join(", ")}]`;
        }
        if (seen.has(t))
            return t.getText(ctxNode, flags);
        seen.add(t);
        const sym = t.getSymbol() ?? t.getAliasSymbol();
        const decls = sym?.getDeclarations() ?? [];
        const isClassOrInterface = decls.some((d) => d.getKind() === ts_morph_1.SyntaxKind.ClassDeclaration ||
            d.getKind() === ts_morph_1.SyntaxKind.InterfaceDeclaration);
        if (t.isObject() || (isClassOrInterface || !sym)) {
            const props = t.getProperties();
            const fields = props.filter((p) => {
                const decl = p.getValueDeclaration();
                if (!decl)
                    return true;
                const k = decl.getKind();
                const isField = k === ts_morph_1.SyntaxKind.PropertySignature ||
                    k === ts_morph_1.SyntaxKind.PropertyDeclaration ||
                    k === ts_morph_1.SyntaxKind.PropertyAssignment ||
                    k === ts_morph_1.SyntaxKind.Parameter;
                if (!isField)
                    return false;
                if (!includePrivate) {
                    const anyDecl = decl;
                    const hasPrivate = anyDecl.hasModifier?.(ts_morph_1.SyntaxKind.PrivateKeyword);
                    const hasProtected = anyDecl.hasModifier?.(ts_morph_1.SyntaxKind.ProtectedKeyword);
                    if (hasPrivate || hasProtected)
                        return false;
                }
                return true;
            });
            if (fields.length === 0)
                return t.getText(ctxNode, flags);
            const parts = fields.map((p) => {
                const name = p.getName();
                const valueDecl = p.getValueDeclaration() ?? p.getDeclarations()[0] ?? ctxNode;
                const pt = p.getTypeAtLocation(valueDecl);
                const piece = go(pt, depth - 1);
                return `${name}: ${piece};`;
            });
            return `{ ${parts.join(" ")} }`;
        }
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
        return t.getText(ctxNode, flags);
    }
    return go(type, maxDepth);
}
function parseArgs() {
    const globs = [];
    const opts = { unwrapPromises: false, includePrivate: false };
    for (let i = 2; i < process.argv.length; i++) {
        const a = process.argv[i];
        if (a === "--unwrap-promises" || a === "-u")
            opts.unwrapPromises = true;
        else if (a === "--include-private" || a === "-p")
            opts.includePrivate = true;
        else
            globs.push(a);
    }
    return { globs, opts };
}
function typeText(type, ctxNode) {
    return type.getText(ctxNode, ts_morph_1.ts.TypeFormatFlags.NoTruncation |
        ts_morph_1.ts.TypeFormatFlags.UseFullyQualifiedType |
        ts_morph_1.ts.TypeFormatFlags.WriteArrowStyleSignature);
}
function maybeUnwrapPromise(type) {
    const awaited = type.getAwaitedType();
    return awaited ?? type;
}
function isVisible(m, includePrivate) {
    if (includePrivate)
        return true;
    return !m.hasModifier(ts_morph_1.SyntaxKind.PrivateKeyword);
}
function printRow(kind, cols) {
    const prefix = kind === "class"
        ? "🏛️ "
        : kind === "method"
            ? "  ├─ "
            : kind === "overload"
                ? "  │  ↳ "
                : "• ";
    console.log(prefix + cols.join("  |  "));
}
//# sourceMappingURL=extractReturnTypes.js.map