import { Controller, Get } from '@nestjs/common';
import { DevMonolithService } from './dev-monolith.service';

@Controller()
export class DevMonolithController {
  constructor() { }

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
      return 
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


}
