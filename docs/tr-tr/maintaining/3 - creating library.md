# Kütüphane oluşturma

Bu komut ile yeni kütüphane oluşturabilirsiniz

```
nest generate lib <kütüphane ismi>
```

Ve ardından npm üzerinden yayınlanabilir yapmak ve diğer kütüphaneler tarafından kullanılabilir yapmak için `npm run xr libs/<kütüphane ismi>` çalıştırılmalıdır. Bu, kütüphane gereksinimlerinin 2. ve 3. maddesini uygulayacaktır. Ancak başka bir sorun teşkil etmemesi adına 1. madde'ye uyulmaı gerekir

**Kütüphane gereksinimleri**

1 - **tüm exportlar `index.ts` üzerinden yapılmalıdır** ve aynı zamanda diğer kütüphaneler **@ubs-platform/kütüphane-ismi** olarak import edilmelidir.

2 - Her kütüphanede 3 dosya olmalı. package.json, tsconfig-lib.json ve tsconfi-lib-publish.json

- publish json'da @ubs-platform/\*\*\* exclude edilmelidir.

3 - package'da kütüphanenin typescripteki path'i @ubs-platform/... olarak başlamalı. ya da en azından package name ve typescript path kısmındakiler aynı olmalıdır. Aynı şekilde xr için bir bölüm olmalıdır

```
    "iksir": {
        "type": "LIBRARY",
        "libraryMode": "EMBEDDED"
    },
```

eğer kütüphane yayınlanmayacaksa libraryMode `EMBED` olmalıdır. Yoksa NPM'de yayınlanacaksa bu `PEER` olmalıdır. daha detaylı bilgi için tools src içini inceleyebilirsiniz
