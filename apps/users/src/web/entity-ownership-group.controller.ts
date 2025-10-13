import { Body, Controller, Injectable, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthLocalGuard } from '../guard/jwt-local.guard';
import { UserCapabilityDTO } from '@ubs-platform/users-common';

@Controller('entity-ownership-group')
export class EntityOwnershipGroupService {
    @UseGuards(JwtAuthLocalGuard)
    @Post('{id}/user-capability')
    addUserCapability(@Body() body: UserCapabilityDTO) {
        throw new Error('Method not implemented.');
    }

    @UseGuards(JwtAuthLocalGuard)
    @Post('{id}/user-capability/{userId}')
    removeUserCapability(@Param('id') id: string, @Param('userId') userId: string) {
        throw new Error('Method not implemented.');
    }
}
