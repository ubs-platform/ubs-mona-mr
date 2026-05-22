import { Inject, Module, DynamicModule } from '@nestjs/common';
import { MongoBaseRepository } from './mongo-base-repository';
import { SqlBaseRepository } from './sql-base-repository';

export function getBaseRepositoryToken(entity: Function | string): string {
  const name = typeof entity === 'function' ? entity.name : entity;
  return `${name}BaseRepository`;
}

export const InjectBaseRepository = (entity: Function | string) =>
  Inject(getBaseRepositoryToken(entity));

@Module({})
export class BaseRepositoryModule {
  static forFeature(
    entities: Function[],
    dbType: 'mongo' | 'sql' = 'mongo',
  ): DynamicModule {
    const providers = entities.map((entity) => {
      const token = getBaseRepositoryToken(entity);
      const injectToken =
        dbType === 'mongo'
          ? getModelTokenSafe(entity.name)
          : getRepositoryTokenSafe(entity);

      return {
        provide: token,
        useFactory: (modelOrRepo: any) => {
          if (dbType === 'mongo') {
            return new MongoBaseRepository(modelOrRepo);
          } else {
            return new SqlBaseRepository(modelOrRepo);
          }
        },
        inject: [injectToken],
      };
    });

    return {
      module: BaseRepositoryModule,
      providers,
      exports: providers,
    };
  }
}

function getModelTokenSafe(modelName: string): string {
  try {
    const { getModelToken } = require('@nestjs/mongoose');
    return getModelToken(modelName);
  } catch (e) {
    return `${modelName}Model`;
  }
}

function getRepositoryTokenSafe(entity: Function): any {
  try {
    const { getRepositoryToken } = require('@nestjs/typeorm');
    return getRepositoryToken(entity);
  } catch (e) {
    return `${entity.name}Repository`;
  }
}
