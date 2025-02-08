import { Module } from '@nestjs/common';
import { UsersRolesService } from './users-roles.service';

@Module({
  providers: [UsersRolesService],
  exports: [UsersRolesService],
})
export class UsersRolesModule {}
