import { Module } from '@nestjs/common';
import { UsersEntityCommonService } from './users-entity-common.service';

@Module({
  providers: [UsersEntityCommonService],
  exports: [UsersEntityCommonService],
})
export class UsersEntityCommonModule {}
