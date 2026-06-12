import { Repository, ObjectLiteral } from 'typeorm';
import { IRepositoryOps, IBaseEntity } from '@ubs-platform/users-entity-common';

export class BaseSqlRepository<T extends IBaseEntity & ObjectLiteral> implements IRepositoryOps<T> {
    constructor(protected readonly repository: Repository<T>) {}

    async findById(id: string): Promise<T | null> {
        const result = await this.repository.findOne({ where: { id } as any });
        return result || null;
    }

    async findAll(): Promise<T[]> {
        return this.repository.find();
    }

    async create(data: Partial<T>): Promise<T> {
        const entity = this.repository.create(data as any);
        return this.repository.save(entity as any);
    }

    async update(id: string, data: Partial<T>): Promise<T | null> {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);
        return (result.affected ?? 0) > 0;
    }
}
