/**
 * A simple async mutex (binary semaphore).
 *
 * Tasks are executed one at a time in FIFO order. While a task is running,
 * any call to `run()` suspends until the lock is released.
 */
export class AsyncMutex {
    private busy = false;
    private readonly waiters: Array<() => void> = [];

    run<T>(task: () => T | Promise<T>): Promise<T> {
        if (!this.busy) {
            this.busy = true;
            return this.execute(task);
        }

        return new Promise<T>((resolve, reject) => {
            this.waiters.push(() => {
                this.execute(task).then(resolve, reject);
            });
        });
    }

    private async execute<T>(task: () => T | Promise<T>): Promise<T> {
        try {
            return await task();
        } finally {
            const next = this.waiters.shift();
            if (next) {
                next();
            } else {
                this.busy = false;
            }
        }
    }
}
