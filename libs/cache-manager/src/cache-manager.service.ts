import { Injectable, Logger } from '@nestjs/common';
import { debounce, max } from 'rxjs';

export interface CachingOptions {
    livetime?: number; // ms
    livetimeExtending?: 'ON_GET' | 'CONSTANT';
}

type Entry<T> = {
    value: T;
    // livetimeExtending ayarını anahtar bazında tutuyoruz
    policy: 'ON_GET' | 'CONSTANT' | null;
    // null => sonsuz ömür
    expiresAt: number | null;
};

type ExpireItem = {
    key: string;
    expiresAt: number; // epoch ms
};

@Injectable()
export class CacheManagerService {
    private readonly logger = new Logger(CacheManagerService.name, {
        timestamp: true,
    });

    // ana veri
    private map = new Map<string, Entry<any>>();
    // in-flight promise dedupe
    private inflight = new Map<string, Promise<any>>();

    // tek zamanlayıcı ve expirations (min-heap benzeri; sort ile yönetiyoruz)
    private scheduler: NodeJS.Timeout | null = null;
    private expirations: ExpireItem[] = []; // küçük N’de sort ucuz; büyük N için binary-heap’e çevrilebilir

    // ---- Public API

    has(key: string): boolean {
        return this.map.has(key);
    }

    get<T>(key: string, co?: CachingOptions): T | undefined {
        const e = this.map.get(key) as Entry<T> | undefined;
        if (!e) return undefined;

        // Süresi dolmuş mu?
        if (e.expiresAt !== null && e.expiresAt <= Date.now()) {
            this.invalidateStr(key);
            return undefined;
        }

        // ON_GET ise TTL uzat
        if (e.policy === 'ON_GET' && e.expiresAt !== null && co?.livetime) {
            this.extendTtl(key, co.livetime);
        }
        this.logger.debug('Presenting cached value: ', key);

        return e.value;
    }

    put<T>(key: string, value: T, co?: CachingOptions): void {
        this.logger.debug('Caching value with key: ', key);
        const policy = co?.livetime
            ? (co.livetimeExtending ?? 'CONSTANT')
            : null;

        const expiresAt = co?.livetime ? Date.now() + co.livetime : null;

        this.map.set(key, { value, policy, expiresAt });

        if (expiresAt !== null) {
            this.scheduleExpire(key, expiresAt);
        }
    }

    async getOrCallAsync<T>(
        key: string,
        cb: () => Promise<T>,
        co?: CachingOptions,
    ): Promise<T> {
        const cached = this.get<T>(key, co);
        if (cached !== undefined) {
            return cached;
        }

        // inflight dedupe
        const pending = this.inflight.get(key) as Promise<T> | undefined;
        if (pending) return pending;

        const p = (async () => {
            try {
                const val = await cb();
                this.put(key, val, co);
                return val;
            } finally {
                this.inflight.delete(key);
            }
        })();

        this.inflight.set(key, p);
        return p;
    }

    getOrCall<T>(key: string, cb: () => T, co?: CachingOptions): T {
        const cached = this.get<T>(key, co);
        if (cached !== undefined) return cached;

        const val = cb();
        this.put(key, val, co);
        return val;
    }

    invalidateStr(key: string): void {
        const existed = this.mapKeyDeletion(key);
        if (!existed) return;
        // expirations listesinden de temizle (lazy clean yapmasak da olur ama listeyi küçük tutmak iyi)
        this.cleanExpirations(key);
    }

    private cleanExpirations(key: string) {
        this.expirations = this.expirations.filter((x) => x.key !== key);
        if (this.expirations.length === 0) this.stopScheduler();
    }

    private mapKeyDeletion(key: string) {
        this.logger.debug('Cached value is about to be invalidated: ', key);

        const existed = this.map.delete(key);
        return existed;
    }

    invalidateRegex(regex: RegExp): void {
        const mapKeys = this.map.keys();
        // const keys: string[] = [];
        // for (const k of this.map.keys()) {
        //     if (regex.test(k)) keys.push(k);
        // }
        // for (const k of keys) this.invalidateStr(k);

        for (const k of mapKeys) {
            if (regex.test(k)) {
                this.invalidateStr(k);
            }
        }
    }

    clear(): void {
        this.map.clear();
        this.inflight.clear();
        this.expirations = [];
        this.stopScheduler();
    }

    // ---- Internal helpers

    private extendTtl(key: string, livetime: number): void {
        const e = this.map.get(key);
        if (!e) return;

        const newExpiry = Date.now() + livetime;
        e.expiresAt = newExpiry;

        // eski expire kaydı kalmış olabilir; lazy-clean yaklaşımı:
        // yeni kaydı ekliyoruz; tetikleyici çalıştığında ana map’teki expiresAt ile karşılaştırıp doğruluyoruz
        this.scheduleExpire(key, newExpiry);
    }

    private scheduleExpire(key: string, expiresAt: number): void {
        this.expirations.push({ key, expiresAt });
        // küçük N için sort yeterli; büyük N’de binary-heap tavsiye edilir
        this.expirations.sort((a, b) => a.expiresAt - b.expiresAt);
        this.ensureScheduler();
    }

    private ensureScheduler(): void {
        if (this.scheduler) return;
        this.scheduler = setTimeout(
            () => this.drainExpirations(),
            this.nextDelay(),
        );
        // Node 16+ için unref opsiyonel: process çıkışını engellemesin
        // if (this.scheduler.unref) this.scheduler.unref();
    }

    private stopScheduler(): void {
        if (this.scheduler) {
            clearTimeout(this.scheduler);
            this.scheduler = null;
        }
    }

    private nextDelay(): number {
        const maxInt = 2 ** 31 - 1;
        if (this.expirations.length === 0) return maxInt; // pratikte "sonsuz"
        const now = Date.now();
        const delta = this.expirations[0].expiresAt - now;
        // negatifse hemen tetikleyelim
        return Math.max(0, Math.min(delta, maxInt));
    }

    private drainExpirations(): void {
        this.scheduler = null;
        const now = Date.now();

        // baştan başlayarak süresi dolanları at
        let i = 0;
        while (
            i < this.expirations.length &&
            this.expirations[i].expiresAt <= now
        ) {
            const { key, expiresAt } = this.expirations[i];
            const e = this.map.get(key);
            // lazy doğrulama: entry hâlâ var ve expiresAt eşleşiyorsa invalid et
            if (
                e &&
                e.expiresAt !== null &&
                e.expiresAt <= now &&
                e.expiresAt === expiresAt
            ) {
                // this.invalidateStr(key)
                // this.map.delete(key);
                this.mapKeyDeletion(key);
            }
            i++;
        }
        if (i > 0) {
            this.expirations.splice(0, i);
        }

        // bir sonrakine kur
        if (this.expirations.length > 0) {
            this.ensureScheduler();
        }
    }
}
