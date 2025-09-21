import { RestApiMethod } from '../rest-doc-extractor/parser/api.data';
export declare const ANGULAR_SERVICE_HEADER: string;
export declare const ANGULAR_SERVICE_FILE_CORE_HEAD: (className: string, parentPath: string) => string;
export declare const ANGULAR_SERVICE_NECESSARY_IMPORTS: (workDir: string, parentPackageName: string, methods: RestApiMethod[]) => string;
export declare const ANGULAR_SERVICE_METHOD: (restMethod: RestApiMethod) => string;
export declare const ANGULAR_SERVICE_FILE_CORE_TAIL = "\n}\n";
