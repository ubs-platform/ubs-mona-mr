import { Controller } from "@nestjs/common";
import { EventPattern } from "@nestjs/microservices";
import { CacheManagerService } from "./cache-manager.service";

@Controller()
export class CacheManagerController {
    constructor(
        private readonly cacheManager: CacheManagerService
    ) { }
    @EventPattern('ubs/cache-manager/clear-cache')
    clearCache() {
        this.cacheManager.clear();
    }

    // Todo: burada Engine5 tarafında instanceGroup'a bakmadan bütün clientlere iletebilir belki bunu düşünmek lazım...
    @EventPattern('ubs/cache-manager/invalidate-key')
    invalidateKey(key: string) {
        this.cacheManager.invalidateStr(key);
    }
}