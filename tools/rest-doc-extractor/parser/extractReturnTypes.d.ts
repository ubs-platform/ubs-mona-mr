import { ts, Type, Node } from "ts-morph";
type InlineOpts = {
    maxDepth?: number;
    unwrapPromises?: boolean;
    includePrivate?: boolean;
    flags?: ts.TypeFormatFlags;
};
export declare function inlineTypeText(type: Type, ctxNode: Node, opts?: InlineOpts): string;
export {};
