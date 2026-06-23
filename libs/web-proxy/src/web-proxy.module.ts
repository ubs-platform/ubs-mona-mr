import { MiddlewareConsumer, Module } from '@nestjs/common';
import { WebProxyService } from './web-proxy.service';
import { WebProxyConfig, WebProxyPathConfig } from './web-proxy-config';

// Proxy yönlendirme kurallarını buraya ekleyin.
// Her target bağımsız olarak kaydedilir; birden fazla uygulama desteklenir.
const config: WebProxyConfig = {
  targets: [
    {
      target: 'http://lotus.tetakent.com',
      changeOrigin: true,
      pathRewrite: { '^/lotus': '' }, // /lotus/foo → http://lotus.tetakent.com/foo
      activatePath: '/lotus/*',
    },
    // İkinci uygulama için örnek:
    // {
    //   target: 'http://postral.tetakent.com',
    //   changeOrigin: true,
    //   pathRewrite: { '^/postral': '' }, // /postral/foo → http://postral.tetakent.com/foo
    //   activatePath: '/postral/*',
    // },
  ],
};

/**
 * Her target için activatePath'e göre benzersiz bir injection token üretir.
 * Aynı token ile birden fazla provider tanımlamak mümkün olmadığından
 * (NestJS sonuncuyu alır, öncekiler kaybolur) bu fonksiyon zorunludur.
 *
 * Örnek: '/lotus/*' → 'WEB_PROXY__LOTUS__'
 */
function createProxyToken(pathConfig: WebProxyPathConfig): string {
  return `WEB_PROXY_${pathConfig.activatePath.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
}

@Module({
  providers: [
    // Her target için ayrı token ile ayrı WebProxyService instance'ı oluşturulur.
    // Yeni bir uygulama eklemek için config.targets'a yeni bir obje eklemeniz yeterli.
    ...config.targets.map((pathConfig) => ({
      provide: createProxyToken(pathConfig),
      useFactory: () => new WebProxyService(pathConfig),
    })),
  ],
  // Token bazlı providerlar başka modüllere inject edilecekse exports buraya eklenir:
  // exports: [createProxyToken(config.targets[0])],
})
export class WebProxyModule {
  configure(consumer: MiddlewareConsumer) {
    // Her proxy target kendi activatePath'i üzerinde middleware olarak bağlanır.
    // NestJS bunları sırayla uygular; çakışan path'ler için sıra önemlidir.
    config.targets.forEach((pathConfig) => {
      consumer
        .apply(() => new WebProxyService(pathConfig))
        .forRoutes(pathConfig.activatePath);
    });
  }
}
