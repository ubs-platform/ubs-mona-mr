import { Module } from '@nestjs/common';
import { UsersEntitySqlService } from './users-entity-sql.service';

@Module({
  providers: [UsersEntitySqlService],
  exports: [UsersEntitySqlService],
})
export class UsersEntitySqlModule {}
