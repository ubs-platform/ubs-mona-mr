# Kütüphane oluşturma

Bu komut ile yeni kütüphane oluşturabilirsiniz

```
nest generate lib <kütüphane ismi>
```

**ÖNEMLİ NOTLAR**

1 - BÜTÜN EXPORTLAR `index.ts` ÜZERİNDEN OLMALIDIR

2 - Her kütüphanede 3 dosya olmalı. package.json, tsconfig-lib.json ve tsconfi-lib-publish.json

- publish json'da @ubs-platform/\*\*\* exclude edilmelidir.

3 - package'da kütüphanenin typescripteki path'i @ubs-platform/... olarak başlamalı. ya da en azından package name ve typescript path kısmındakiler aynı olmalıdır. Aynı şekilde iksir için (tools içindeki projenin ismini iksir koydum banane :D ) bir bölüm olmalıdır

```
    "iksir": {
        "type": "LIBRARY",
        "libraryMode": "EMBEDDED"
    },
```

eğer kütüphane yayınlanmayacaksa libraryMode `EMBED` olmalıdır. Yoksa NPM'de yayınlanacaksa bu `PEER` olmalıdır. daha detaylı bilgi için tools src içini inceleyebilirsiniz
