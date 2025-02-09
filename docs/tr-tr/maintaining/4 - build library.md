# Kütüphaneyi derleyip npm'e gönderme

- Build etme
  `nest build core --tsc`

    - --tsc parametresi build ve push yapmak için önemlidir. yoksa export ettiğiniz metotları başka proje okuyamıyor.

- dist/core içine bunlar eklemeli:

```JSON
{
    "name": "@ubs-platform/mona-experiment-one",
    "version": "0.0.5",
    "description": "An experiment on NPM and package managing. please do not install",
    "author": "",
    "private": false,
    "license": "MIT",
    "scripts": {},
    "peerDependencies": {
        "@nestjs/common": "^11.0.1",
        "@nestjs/core": "^11.0.1",
        "@nestjs/platform-express": "^11.0.1",
        "reflect-metadata": "^0.2.2",
        "rxjs": "^7.8.1"
    },
    "main": "index.js"
}

```

giriş noktası yani `main`, yapılan builde göre düzenlenmelidir. Örneğin bu şekilde gözüküyorsa

```
-users-microservice-helper
---microservice-setup-util
---users-common
---users-consts
---users-microservice-helper
------src
---------index.js
```

Eğer diğer kütüphanelerden import aldıysanız bu şekilde gözükmesi gayet normal.
Böyle bir durumda `main`:`users-microservice-helper/src/index.js` olmalıdır. İmport ederken users-microservice-helper/src/ diye uzatmamak için bu idealdir

Muhtemelen burada kök dizindeki package.json'daki nest ve ya benzeri dependency'ler peerDependency olarak eklenmelidir.

Ve ardından build edip bu şekilde pushlayabilirsiniz

```
npm publish --access public
```

Eğer `--access public` unutursan npm buna dönüşüyor:

![Aykut elmas](https://media.tenor.com/0zqGGmG01tcAAAAM/bana-para-ver.gif)
