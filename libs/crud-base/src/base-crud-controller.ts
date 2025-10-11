import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';

import {
    CurrentUser,
    JwtAuthGuard,
    UserIntercept,
} from '@ubs-platform/users-microservice-helper';

import { Roles, RolesGuard } from '@ubs-platform/users-roles';
import { BaseCrudService } from '@ubs-platform/crud-base';
import { BaseCrudKlass } from './base-crud-klass';
import { SearchRequest } from '@ubs-platform/crud-base-common';
import { UserAuthBackendDTO } from '@ubs-platform/users-common';

export type RoleAuthorizationConfigKey =
    | 'EDIT'
    | 'ADD'
    | 'REMOVE'
    | 'GETALL'
    | 'GETID'
    | 'ALL';

export type RoleAuthorizationDetailed = {
    needsAuthenticated?: boolean;
    roles?: string[];
};

export type RoleAuthorization =
    | null
    | undefined
    | boolean
    | RoleAuthorizationDetailed;

export interface ControllerConfiguration {
    authorization: { [key in RoleAuthorizationConfigKey]?: RoleAuthorization };
}

/*@ts-ignore*/
export const BaseCrudControllerGenerator = <
    MODEL,
    INPUT extends { _id?: any },
    OUTPUT,
    SEARCH,
>(
    r: ControllerConfiguration,
) => {
    const findExistAuth = (field: RoleAuthorizationConfigKey) => {
        let a = r.authorization[field] || r.authorization.ALL;
        if (a === true) {
            return {
                needsAuthenticated: true,
                roles: [],
            } as RoleAuthorizationDetailed;
        } else if (!a) {
            return {
                needsAuthenticated: false,
                roles: [],
            } as RoleAuthorizationDetailed;
        } else {
            if (a.needsAuthenticated == null) {
                if (a.roles?.length) {
                    a.needsAuthenticated = true;
                } else {
                    a.needsAuthenticated = false;
                }
            }
            return a as RoleAuthorizationDetailed;
        }
    };

    const RoleConfig = (field: RoleAuthorizationConfigKey) => {
        let authorization = findExistAuth(field);
        // if (meta == null) meta = {};
        const guard = UseGuards(
            //@ts-ignore
            ...[
                authorization.needsAuthenticated ? JwtAuthGuard : null,
                authorization.needsAuthenticated && authorization.roles
                    ? RolesGuard
                    : null,
            ].filter((a) => a),
        );
        const roles = Roles(authorization.roles);

        return (target, propKey, descriptor) => {
            guard(target, propKey, descriptor);
            roles(target, propKey, descriptor);
        };
    };
    let service: BaseCrudService<MODEL, INPUT, OUTPUT, SEARCH>;

    class ControllerClass {
        constructor(servicex: BaseCrudService<MODEL, INPUT, OUTPUT, SEARCH>) {
            service = servicex;
        }

        // @UseGuards(...generateGuardAndRolesEtc('GETALL')[0])
        // @Roles(generateGuardAndRolesEtc('GETALL')[1])
        @RoleConfig('GETALL')
        @Get()
        @UseGuards(UserIntercept)
        async fetchAll(
            @Query() s?: SEARCH,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            return await service.fetchAll(s, user);
        }
        @RoleConfig('GETALL')
        @Get('_search')
        @UseGuards(UserIntercept)
        async search(
            @Query() s: SEARCH & SearchRequest,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            return await service.searchPagination(s, user);
        }
        @Get('/:id')
        @RoleConfig('GETID')
        @UseGuards(UserIntercept)
        async fetchOne(
            @Param() { id }: { id: any },
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            return await service.fetchOne(id, user);
        }

        @RoleConfig('ADD')
        @Post()
        @UseGuards(UserIntercept)
        async add(
            @Body() body: INPUT,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            return await service.create(body, user);
        }

        @RoleConfig('EDIT')
        @Put()
        @UseGuards(UserIntercept)
        async edit(
            @Body() body: INPUT,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            if (body._id == null) {
                throw new NotFoundException();
            }
            return await service.edit(body, user);
        }

        @Delete(':id')
        @RoleConfig('REMOVE')
        @UseGuards(UserIntercept)
        async remove(
            @Param() { id }: { id: any },
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            return await service.remove(id, user);
        }
    }

    return ControllerClass;
};
