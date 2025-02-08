import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreService {
    printVerbose() {
        return `NOLURSUN COREUTİLS ÇALIŞSIN AMK`;
    }
}
