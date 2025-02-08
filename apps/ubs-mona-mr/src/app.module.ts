import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreService, CoreModule } from '@ubs-platform/mona-experiment-one';

@Module({
    imports: [],
    controllers: [AppController],
    providers: [AppService, CoreService],
})
export class AppModule {}
