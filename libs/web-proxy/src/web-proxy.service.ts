import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { WebProxyPathConfig } from './web-proxy-config';
    
export class WebProxyService implements NestMiddleware {

    private proxy: RequestHandler;

    constructor(pathConfig?: WebProxyPathConfig) {
        const htmlPathPrefix = pathConfig?.htmlPathPrefix;

        this.proxy = createProxyMiddleware({
            // Destination microservice URL
            target: pathConfig?.target || 'http://localhost:3000',
            // Modifies the host header to match target URL
            changeOrigin: pathConfig?.changeOrigin ?? true,
            // Optional: strip '/proxy-api' prefix before forwarding
            pathRewrite: pathConfig?.pathRewrite || { '^/proxy-api': '' },
            // When htmlPathPrefix is set, we handle the response ourselves to rewrite paths
            selfHandleResponse: !!htmlPathPrefix,
            // Safely forwards payloads if NestJS body-parser is enabled
            on: {
                proxyReq: (proxyReq, req: any) => {

                    // When we self-handle the response to rewrite paths, we need
                    // plain (uncompressed) content. Removing Accept-Encoding forces
                    // the target to respond without gzip/br/deflate, so we don't
                    // have to decompress manually and the browser won't see a
                    // mismatched Content-Encoding header.
                    if (htmlPathPrefix) {
                        proxyReq.removeHeader('accept-encoding');
                    }

                    if (req.body) {
                        const bodyData = JSON.stringify(req.body);
                        if (!proxyReq.getHeader('Content-Type') || proxyReq.getHeader('Content-Type') === 'application/json') {
                            proxyReq.setHeader('Content-Type', 'application/json');
                            proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                            proxyReq.write(bodyData);
                            return;
                        }

                        if (proxyReq.getHeader('Content-Type') === 'application/x-www-form-urlencoded') {
                            const urlSearchParams = new URLSearchParams(req.body);
                            const formData = urlSearchParams.toString();
                            proxyReq.setHeader('Content-Length', Buffer.byteLength(formData));
                            proxyReq.write(formData);
                            return;
                        }
                    }
                },
                proxyRes: htmlPathPrefix
                    ? (proxyRes, _req, res: any) => {
                        const contentType = proxyRes.headers['content-type'] || '';
                        const isTextContent =
                            contentType.includes('text/html') ||
                            contentType.includes('text/css') ||
                            contentType.includes('javascript');

                        // Copy response headers
                        Object.entries(proxyRes.headers).forEach(([key, value]) => {
                            if (value !== undefined) res.setHeader(key, value);
                        });
                        res.statusCode = proxyRes.statusCode || 200;

                        if (!isTextContent) {
                            // Binary content (images, fonts, etc.) — pipe through as-is
                            proxyRes.pipe(res);
                            return;
                        }

                        // Buffer text content and rewrite absolute paths
                        const chunks: Buffer[] = [];
                        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
                        proxyRes.on('end', () => {
                            let body = Buffer.concat(chunks).toString('utf8');

                            // src="/foo" → src="/ut/foo"  (double-slash safe: skips "//")
                            body = body
                                .replace(/(src|href|action)="\/(?!\/)/g, `$1="${htmlPathPrefix}/`)
                                .replace(/(src|href|action)='\/(?!\/)/g, `$1='${htmlPathPrefix}/`)
                                .replace(/url\(\/(?!\/)/g, `url(${htmlPathPrefix}/`);

                            res.removeHeader('content-length'); // body size changed
                            res.end(body);
                        });
                    }
                    : undefined,
            },
        });
    }

    use(req: Request, res: Response, next: NextFunction) {
        this.proxy(req, res, next);
    }
}
