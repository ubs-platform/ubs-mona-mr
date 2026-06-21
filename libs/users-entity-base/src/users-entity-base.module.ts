import { Module } from '@nestjs/common';
import { UsersEntityBaseService } from './users-entity-base.service';

@Module({
  providers: [UsersEntityBaseService],
  exports: [UsersEntityBaseService],
})
export class UsersEntityBaseModule {}
