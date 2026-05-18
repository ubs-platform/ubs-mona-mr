import { Module } from "@nestjs/common";
import { MicroserviceSetupUtil } from "./microservice-setup-util";
import { ClientsModule } from "@nestjs/microservices";
import { MICROSERVICE_CLIENT } from "./consts";
const msClient = ClientsModule.register([MicroserviceSetupUtil.setupClient('', MICROSERVICE_CLIENT)]);
@Module({
    imports: [msClient],
    controllers: [],
    providers: [],
    exports: [
        msClient,
    ],
})
export class MicroservicesCommonModule { }