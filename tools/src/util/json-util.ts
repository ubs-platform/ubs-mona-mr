import * as FileSystem from 'fs/promises';
import path from 'path';
import cJSON, { CommentObject } from 'comment-json';
import { IksirPackage } from '../data/iksir-package';
export class JsonUtil {
    static async readJson<T>(...paths: string[]) {
        return cJSON.parse(
            await FileSystem.readFile(path.join(...paths), 'utf-8'),
        ) as any as T;
    }
}
