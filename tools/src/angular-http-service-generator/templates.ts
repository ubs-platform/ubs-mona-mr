import { RestApiMethod } from '../rest-doc-extractor/parser/api.data';

export const ANGULAR_SERVICE_FILE_CORE_HEAD = (className: string) => `
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ${className} {
  constructor(private http: HttpClient) {}`;

export const ANGULAR_SERVICE_METHODS = (methods: RestApiMethod[]) => {
    for (let index = 0; index < methods.length; index++) {
        const method = methods[index];

        // const methodName = method.|| `method${index + 1}`;

    }
};

export const ANGULAR_SERVICE_FILE_CORE_TAIL = `
}
`;
