import { Module } from '@nestjs/common';
import { DevMonolithController } from './dev-monolith.controller';
import { DevMonolithService } from './dev-monolith.service';
import { AppModule as FilesAppModule } from '../../files/src/app.module';
import { AppModule as SocialAppModule } from '../../social/src/app.module';
import { UsersModule as UsersAppModule } from '../../users/src/users.module';
import { AppModule as FeedbackModule } from '../../feedback/src/app/app.module';
import { AppModule as NotifyModule } from '../../notify/src/app/app.module';

@Module({
    imports: [
        FilesAppModule,
        SocialAppModule,
        UsersAppModule,
        FeedbackModule,
        NotifyModule,
    ],
    controllers: [DevMonolithController],
    providers: [],
})
export class DevMonolithModule {}
