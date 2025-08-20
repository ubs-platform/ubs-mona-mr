import { Injectable } from '@nestjs/common';

export interface CachingOptions {
    livetime?: number; // as ms
    livetimeExtending?: 'ON_GET' | 'CONSTANT';
}

@Injectable()
export class CacheManagerService {
    map = new Map<string, any>();
    timeoutPtrs = new Map<string, any>();

    invalidateStr(key: string) {
        this.map.delete(key);
        console.debug(`${key} => value is invalidated`);
    }

    //     invalidateRegex(key: RegExp) {
    //         const keys = this.map.keys()
    //         let currentKey = "";

    //         do {
    // keys.next()
    //         } while(currentKey != null)

    //     }

    put(key: string, value: any, co?: CachingOptions) {
        this.map.set(key, value);

        if (co?.livetime) {
            const onGetCondition =
                co.livetimeExtending == 'ON_GET' && this.timeoutPtrs.has(key);
            if (onGetCondition) {
                console.debug(
                    `${key} => ON_GET lifetime extension enabled. About to be increased lifetime`,
                );

                clearTimeout(this.timeoutPtrs.get(key));
            }

            let ptr = setTimeout(() => {
                this.invalidateStr(key);
            }, co.livetime);

            if (co.livetimeExtending == 'ON_GET') {
                this.timeoutPtrs.set(key, ptr);
            }
        }
    }

    async getOrCallAsync<T>(
        key: string,
        cb: () => Promise<T>,
        co?: CachingOptions,
    ) {
        if (this.map.has(key)) {
            console.debug(
                `${key} value is already cached - returning cached value`,
            );
            return this.map.get(key);
        } else {
            const val = await cb();
            this.put(key, val, co);
            console.debug(`${key} => value will be cached`);
            return val;
        }
    }

    getOrCall<T>(key: string, cb: () => T, co?: CachingOptions) {
        if (this.map.has(key)) {
            console.debug(
                `${key} value is already cached - returning cached value`,
            );
            return this.map.get(key);
        } else {
            const val = cb();
            this.put(key, val, co);
            console.debug(`${key} => value will be cached`);

            return val;
        }
    }
}
