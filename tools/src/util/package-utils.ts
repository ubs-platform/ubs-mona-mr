import * as FileSystem from 'fs/promises';

export class PackageUtils {
    static async packageObject() {
        let content = await FileSystem.readFile(filePath, 'utf8');
    }
}
