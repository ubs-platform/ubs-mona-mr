# Docker compose kullanarak paketleri çalıştırmak
infrastructure klasörü altında [docker-compose-full.yml](../../../infrastructure/docker-compose-full.yml) dosyasıyla erişebilirsiniz

```
    cd infrastructure
    docker compose -f docker-compose-full.yml up -d
```

## Önemli notlar

- Dosyadaki sürüm ile güncel sürüm ile farklı olabilir. Bu durumda `hcangunduz/ubs-mona-files:5.0.5-beta` gibi satırlarda `5.0.5-beta` yazan yerlerde package json'da yer alan "version" ile `iksir.childrenVersionTag` kısımlarına bakabilirsiniz. eğer childrenVersionTag boş, latest ya da stable ise boş kalacaktır ve tag sadece `version` olacaktır. Aksi halde tag: "version-childrenVersionTag" olacaktır