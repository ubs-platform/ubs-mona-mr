
export interface WebProxyPathConfig {
    target: string; // Target microservice URL
    pathRewrite?: Record<string, string>; // Optional path rewrite rules
    changeOrigin?: boolean; // Whether to change the origin header
    activatePath: string; // The path prefix to activate this proxy
    /**
     * Statik site proxy'lemek için: HTML/CSS/JS içindeki mutlak path referanslarını
     * (ör. src="/game.js") bu prefix ile yeniden yazar (ör. src="/ut/game.js").
     * Genellikle activatePath'in kök kısmıdır. Ör: '/ut'
     */
    htmlPathPrefix?: string;
}

export interface WebProxyConfig {
    targets: WebProxyPathConfig[];
}