import * as FileSystem from 'fs/promises';
import { DirectoryUtil } from './directory-util';
import { TextUtil } from './text-util';

export class PackageUtils {
    
    static async findAllImports(directory: string) {
        let content = await TextUtil.findByRegex(directory)
    }
}
