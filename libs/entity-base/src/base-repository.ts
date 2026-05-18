export abstract class BaseRepository<DATA, OPTIONS = any> {
    abstract create(item: DATA, options?: OPTIONS): Promise<DATA>;
    abstract findById(id: string, options?: OPTIONS): Promise<DATA | null>;
    abstract findAll(options?: OPTIONS): Promise<DATA[]>;
    abstract update(id: string, item: DATA, options?: OPTIONS): Promise<DATA>;
    abstract delete(id: string, options?: OPTIONS): Promise<void>;
}