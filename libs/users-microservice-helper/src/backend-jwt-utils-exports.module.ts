import { JwtConstants } from '@mona/users/consts';
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// @Module({
//   controllers: [],
//   providers: [],
//   exports: [],
//   imports: [

//   ],
// })
// export class BackendJwtUtilsExportModule {}

export const BackendJwtUtilsExportModule = [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
        secret: JwtConstants.SECRET_JWT,
        signOptions: { expiresIn: '30d' },
    }),
];
