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
import { Optional } from '@ubs-platform/crud-base-common/utils';

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
export const BaseCrudControllerGenerator = <MODEL, ID, INPUT, OUTPUT, SEARCH>(
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
    let service: BaseCrudService<MODEL, ID, INPUT, OUTPUT, SEARCH>;

    class ControllerClass {
        constructor(public servicex: BaseCrudService<MODEL, ID, INPUT, OUTPUT, SEARCH>) {
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
            const manipulatedSearch = await this.manipulateSearch(user, s);
            return await service.fetchAll(manipulatedSearch, user);
        }
        @RoleConfig('GETALL')
        @Get('_search')
        @UseGuards(UserIntercept)
        async search(
            @Query() s: SEARCH & SearchRequest,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            const manipulatedSearch = await this.manipulateSearch(user, s);
            return await service.searchPagination(manipulatedSearch, user);
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
            await this.checkUser('ADD', user, null, body);

            return await service.create(body, user);
        }

        @RoleConfig('EDIT')
        @Put()
        @UseGuards(UserIntercept)
        async edit(
            @Body() body: INPUT,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            if (this.servicex.getIdFieldNameFromInput(body) == null) {
                throw new NotFoundException();
            }
            await this.checkUser('EDIT', user, null, body);

            // this.checkUser(user, nu)
            return await service.edit(body, user);
        }

        @Delete(':id')
        @RoleConfig('REMOVE')
        @UseGuards(UserIntercept)
        async remove(
            @Param() { id }: { id: any },
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            await this.checkUser('REMOVE', user, { id }, null);
            // if (id == null) {
            //     throw new NotFoundException();
            // this.checkUser(user, { id } as any, "REMOVE", undefined);
            return await service.remove(id, user);
        }

        async checkUser(
            operation: 'ADD' | 'EDIT' | 'REMOVE' | 'GETALL' | 'GETID',
            user: Optional<UserAuthBackendDTO>,
            queriesAndPaths: Optional<{ [key: string]: any }>,
            body: Optional<INPUT>,
        ) {
            // Implement your user checking logic here
        }

        async manipulateSearch(
            user: Optional<UserAuthBackendDTO>,
            queriesAndPaths: Optional<SEARCH>,
        ): Promise<any> {
            // Implement your user checking logic here
            return queriesAndPaths;
        }
    }

    return ControllerClass;
};
