export interface IBaseEntity {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class BaseEntity implements IBaseEntity {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
