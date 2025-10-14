# Kaynak kodları kullanarak çalıştırmak

Bir uygulamayı çalıştırmak için bunu çalıştırabilirsiniz

```
npm run start <app ismi>
```

Uygulama isimleri "apps" klasörü altındaki klasörlere bakabilirsiniz. Şu anki en temel uygulamalar şunlardır

- **Users** - Kullanıcı'nın üye olup giriş yapmasını sağlar, rolleri ve entity sahipliklerini tutar ve yönetir.  Kafka, TCP ve Rest API kullanır. 

- **Files** - Dosya servisi, rest api yardımı ile upload yapar ve TCP haberleşmesi ile dosya validasyonu sağlanır.

- **Notify** - Email için gerekli şablonları tutar ve bu şablonlardan email hazırlayarak gönderir. Kafka ve Rest API kullanır. 


- **Dev Monolith** - Bütün mikroservislerin bir arada tek port üstünde çalışmasını sağlar


Bu uygulamaları herbiri ayrı terminalde şu şekilde çalıştırılabilir:

```
    npm run start users
    npm run start files
    npm run start notify
    npm run start ...
```