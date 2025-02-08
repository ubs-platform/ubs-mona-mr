import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
// import { CoreUtils } from '../../../dist/libs/core/index';
// import { CoreUtils } from 'mona/core';
import { CoreUtils, CoreService } from '@ubs-platform/mona-experiment-one';
// import {  } from 'mona/core';
@Controller()
export class AppController {
    constructor(private coreService: CoreService) {}

    @Get()
    getHello(): string {
        return this.coreService.printVerbose();
        // console.info(CoreUtils);
        // return CoreUtils.printVerbose();
        // return CoreUtils.printVerbose();
        // return this.appService.getHello();
    }
}
