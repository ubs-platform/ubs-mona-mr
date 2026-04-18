import {
    Body,
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

const findExistAuth = (
    field: RoleAuthorizationConfigKey,
    r: ControllerConfiguration,
): RoleAuthorizationDetailed => {
    let a = r.authorization[field] || r.authorization.ALL;
    if (a === true) {
        return { needsAuthenticated: true, roles: [] };
    } else if (!a) {
        return { needsAuthenticated: false, roles: [] };
    } else {
        const detailed = a as RoleAuthorizationDetailed;
        if (detailed.needsAuthenticated == null) {
            detailed.needsAuthenticated = !!(detailed.roles?.length);
        }
        return detailed;
    }
};

/**
 * Class decorator that applies role-based authorization guards to the
 * CRUD methods inherited from BaseCrudController.
 *
 * Each decorated subclass gets its own wrapper functions so that different
 * controllers can carry different guard metadata without colliding.
 *
 * Usage:
 * ```ts
 * @Controller('my-resource')
 * @CrudControllerConfig({ authorization: { ALL: { needsAuthenticated: true, roles: ['ADMIN'] } } })
 * export class MyController extends BaseCrudController<...> {
 *     constructor(service: MyService) { super(service); }
 * }
 * ```
 */
export function CrudControllerConfig(r: ControllerConfiguration) {
    return function (target: Function) {
        const proto = target.prototype;
        const baseProto = Object.getPrototypeOf(proto);
        const baseClass = baseProto.constructor;

        const methodRoles: [string, RoleAuthorizationConfigKey][] = [
            ['fetchAll', 'GETALL'],
            ['search', 'GETALL'],
            ['fetchOne', 'GETID'],
            ['add', 'ADD'],
            ['edit', 'EDIT'],
            ['remove', 'REMOVE'],
        ];

        for (const [methodName, role] of methodRoles) {
            // Find the method descriptor walking up the prototype chain
            let searchProto = baseProto;
            let descriptor: PropertyDescriptor | undefined;
            while (searchProto && searchProto !== Object.prototype) {
                descriptor = Object.getOwnPropertyDescriptor(searchProto, methodName);
                if (descriptor) break;
                searchProto = Object.getPrototypeOf(searchProto);
            }
            if (!descriptor || typeof descriptor.value !== 'function') continue;

            const originalFn = descriptor.value;

            // Wrap in a new function so each subclass has its own function object.
            // This prevents guard metadata from leaking across controllers that share
            // the same base-class method reference.
            const wrappedFn = async function (this: any, ...args: any[]) {
                return originalFn.apply(this, args);
            };

            // Copy function-level metadata (PATH_METADATA, METHOD_METADATA, GUARDS_METADATA, …)
            for (const key of Reflect.getMetadataKeys(originalFn)) {
                Reflect.defineMetadata(key, Reflect.getMetadata(key, originalFn), wrappedFn);
            }

            // Define the wrapper on the subclass prototype
            Object.defineProperty(proto, methodName, { ...descriptor, value: wrappedFn });

            // Copy class+property-keyed metadata (parameter decorators: @Query, @Body, …)
            for (const key of Reflect.getMetadataKeys(baseClass, methodName)) {
                Reflect.defineMetadata(
                    key,
                    Reflect.getMetadata(key, baseClass, methodName),
                    target,
                    methodName,
                );
            }

            // Apply authorization guards for this operation
            const authorization = findExistAuth(role, r);
            const guards = [
                authorization.needsAuthenticated ? JwtAuthGuard : null,
                authorization.needsAuthenticated && authorization.roles?.length ? RolesGuard : null,
            ].filter(Boolean) as Function[];

            const newDescriptor = Object.getOwnPropertyDescriptor(proto, methodName)!;
            if (guards.length) {
                // @ts-ignore – spread of dynamic guard array
                UseGuards(...guards)(proto, methodName, newDescriptor);
            }
            Roles(authorization.roles || [])(proto, methodName, newDescriptor);
        }
    };
}

export class BaseCrudController<MODEL, ID, INPUT, OUTPUT, SEARCH> {
    constructor(public servicex: BaseCrudService<MODEL, ID, INPUT, OUTPUT, SEARCH>) {}

    @Get()
    @UseGuards(UserIntercept)
    async fetchAll(
        @Query() s?: SEARCH,
        @CurrentUser() user?: UserAuthBackendDTO,
    ) {
        await this.checkUser('GETALL', user, s!, null);
        const manipulatedSearch = await this.manipulateSearch(user, s);
        return await this.servicex.fetchAll(manipulatedSearch, user);
    }

    @Get('_search')
    @UseGuards(UserIntercept)
    async search(
        @Query() s: SEARCH & SearchRequest,
        @CurrentUser() user?: UserAuthBackendDTO,
    ) {
        await this.checkUser('GETALL', user, s!, null);
        const manipulatedSearch = await this.manipulateSearch(user, s);
        return await this.servicex.searchPagination(manipulatedSearch, user);
    }

    @Get('/:id')
    @UseGuards(UserIntercept)
    async fetchOne(
        @Param() { id }: { id: any },
        @CurrentUser() user?: UserAuthBackendDTO,
    ) {
        await this.checkUser('GETID', user, { id }, null);
        return await this.servicex.fetchOne(id, user);
    }

    @Post()
    @UseGuards(UserIntercept)
    async add(
        @Body() body: INPUT,
        @CurrentUser() user?: UserAuthBackendDTO,
    ) {
        await this.checkUser('ADD', user, null, body);
        return await this.servicex.create(body, user);
    }

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
        return await this.servicex.edit(body, user);
    }

    @Delete(':id')
    @UseGuards(UserIntercept)
    async remove(
        @Param() { id }: { id: any },
        @CurrentUser() user?: UserAuthBackendDTO,
    ) {
        await this.checkUser('REMOVE', user, { id }, null);
        return await this.servicex.remove(id, user);
    }

    async checkUser(
        operation: 'ADD' | 'EDIT' | 'REMOVE' | 'GETALL' | 'GETID',
        user: Optional<UserAuthBackendDTO>,
        queriesAndPaths: Optional<{ [key: string]: any }>,
        body: Optional<INPUT>,
    ) {}

    async manipulateSearch(
        user: Optional<UserAuthBackendDTO>,
        queriesAndPaths: Optional<SEARCH>,
    ): Promise<any> {
        return queriesAndPaths;
    }
}

// ---------------------------------------------------------------------------
// Kept for backward compatibility with existing controllers.
// New code should prefer BaseCrudController + @CrudControllerConfig(config).
// ---------------------------------------------------------------------------
/*@ts-ignore*/
export const BaseCrudControllerGenerator = <MODEL, ID, INPUT, OUTPUT, SEARCH>(
    r: ControllerConfiguration,
) => {
    const RoleConfig = (field: RoleAuthorizationConfigKey) => {
        const authorization = findExistAuth(field, r);
        const guard = UseGuards(
            // @ts-ignore
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

        @RoleConfig('GETALL')
        @Get()
        @UseGuards(UserIntercept)
        async fetchAll(
            @Query() s?: SEARCH,
            @CurrentUser() user?: UserAuthBackendDTO,
        ) {
            await this.checkUser('GETALL', user, s!, null);
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
            await this.checkUser('GETALL', user, s!, null);
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
            await this.checkUser('GETID', user, { id }, null);
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
            return await service.remove(id, user);
        }

        async checkUser(
            operation: 'ADD' | 'EDIT' | 'REMOVE' | 'GETALL' | 'GETID',
            user: Optional<UserAuthBackendDTO>,
            queriesAndPaths: Optional<{ [key: string]: any }>,
            body: Optional<INPUT>,
        ) {}

        async manipulateSearch(
            user: Optional<UserAuthBackendDTO>,
            queriesAndPaths: Optional<SEARCH>,
        ): Promise<any> {
            return queriesAndPaths;
        }
    }

    return ControllerClass;
};
