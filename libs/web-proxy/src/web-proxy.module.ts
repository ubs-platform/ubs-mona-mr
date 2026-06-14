import { MiddlewareConsumer, Module } from '@nestjs/common';
import { WebProxyService } from './web-proxy.service';
import { WebProxyConfig, WebProxyPathConfig } from './web-proxy-config';
import { exec } from 'child_process';

// Proxy yönlendirme kurallarını buraya ekleyin.
// Her target bağımsız olarak kaydedilir; birden fazla uygulama desteklenir.
const config: WebProxyConfig = {
  targets: [
    {
      target: 'https://lotus.tetakent.com/', // Lotus uygulamasının auth microservice URL'si
      changeOrigin: true, // Lotus uygulaması için changeOrigin gerekli
      pathRewrite: { '^/lotus': '' }, // /lotus/foo → http://lotus.tetakent.com/api/auth/foo
      activatePath: '/lotus/', // Bu proxy sadece /lotus/* path'leri için aktif olur
      htmlPathPrefix: '/lotus/', // HTML/CSS/JS içindeki mutlak path'leri yeniden yaz
    },

    {
      target: 'http://localhost:5502/',
      changeOrigin: false, // Localhost hedefler için changeOrigin genellikle gerekmez
      activatePath: '/ut/', // Bu proxy sadece /ut/* path'leri için aktif olur
      htmlPathPrefix: '/ut/', // HTML/CSS/JS içindeki mutlak path'leri yeniden yaz
    },
    // Test olarak saçma sapan bir repoda undertale oyununun webte çalışan versiyonunu proxy'liyoruz, bu proxy ile bütün canavarları kesip sans ile kapışacağım ve ruhumu chara'ya satacağım: PS: Vazgeçtim tetakent.com'u deneyeceğim...
    {
      target: 'https://tetakent.com/',
      changeOrigin: true,
      pathRewrite: { '^/tetakent': '/' }, // /tetakent/foo → https://tetakent.com/foo
      activatePath: '/tetakent/', // Bu proxy sadece /tetakent/* path'leri için aktif olur
      // htmlPathPrefix: '/tetakent/', // HTML/CSS/JS içindeki mutlak path'leri yeniden yaz
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
  const random = Math.random().toString(36).substring(2, 8); // Benzersiz token için rastgele bir string ekleyelim
  return `WEB_PROXY_${pathConfig.activatePath.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${random}`;
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
      exec((`kdialog --title "Proxy Activated" --passivepopup "Proxy for ${pathConfig.activatePath} is now active!" 5`), (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing kdialog: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`kdialog stderr: ${stderr}`);
          return;
        }
        console.log(`kdialog stdout: ${stdout}`);
      });
      consumer
        .apply(

          // () => new WebProxyService(pathConfig)
          class extends WebProxyService {
            constructor() {
              super(pathConfig);
            }
          }
        )
        .forRoutes(pathConfig.activatePath);
    });
  }
}
