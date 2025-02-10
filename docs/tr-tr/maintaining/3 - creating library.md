# Kütüphane oluşturma

Bu komut ile yeni kütüphane oluşturabilirsiniz

```
nest generate lib <kütüphane ismi>
```

Her kütüphanede 3 dosya olmalı. package.json, tsconfig-lib.json ve tsconfi-lib-publish.json

publish json'da @ubs-platform/\*\*\* exclude edilmelidir

package'da kütüphanenin typescripteki path'i @ubs-platform/... olarak başlamalı. ya da en azından package name ve typescript path kısmındakiler aynı olmalıdır. Aynı şekilde iksir için (tools içindeki projenin ismini iksir koydum banane :D ) bir bölüm olmalıdır

```
    "iksir": {
        "type": "LIBRARY",
        "libraryMode": "EMBED"
    },
```

eğer kütüphane yayınlanmayacaksa libraryMode `EMBED` olmalıdır. Yoksa NPM'de yayınlanacaksa bu `PEER` olmalıdır. daha detaylı bilgi için tools src içini inceleyebilirsiniz
