import { Controller, Get, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern } from '@nestjs/microservices';

@Controller()
export class DevMonolithController {
    constructor(@Inject('MICROSERVICE_CLIENT') private client: ClientKafka) {}

    @Get('apidocs/api-viewer.html')
    getViewer() {
        // read from apps/dev-monolith/apidocs/rest-api.json and return its content
        const fs = require('fs');
        const path = 'apps/dev-monolith/apidocs/api-viewer.html';
        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path, 'utf8');
            return new Response(data, {
                headers: { 'Content-Type': 'text/html' },
            });
            // return as html
            return;
        } else {
            return { error: 'API documentation not found.' };
        }
    }

    @Get('apidocs/rest-api.json')
    getApiDocs() {
        // read from apps/dev-monolith/apidocs/rest-api.json and return its content
        const fs = require('fs');
        const path = 'apps/dev-monolith/apidocs/rest-api.json';
        if (fs.existsSync(path)) {
            const data = fs.readFileSync(path, 'utf8');
            return JSON.parse(data);
        } else {
            return { error: 'API documentation not found.' };
        }
    }

    // @MessagePattern('ping')
    // pong(data: any): string {
    //   throw new Error('Örnek hata');
    //   console.info(data);  
    //   return 'response testi';
    // }

    // @Get('send-ping-self')
    // async sendPing() {
    //     return await this.client.send('ping', {
    //         text: 'ping',
    //     });
    // }
}
