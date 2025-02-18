# Temel gereksinimler

Mona platformu, bu paketlere ihtiyaç duymaktadır

- MongoDB
- Kafka

Bu paketleri [infrastructure klasörü altındaki docker-compose dosyasıyla](../../../infrastructure/docker-compose.yml) temin edebilirsiniz.

```bash
cd infrastructure
docker compose up -d
# zookeeper'ın ayağa kalkma hızına göre bir kaç saniye sonra tekrar çalışırmanız gerekebilir
```

Eğer sisteminizde docker kurulu değilse bu rehberi okuyabilirsiniz:

[Windows'ta docker kurulumu](https://docs.docker.com/desktop/setup/install/windows-install/)

[Linux sistemlerinde docker kurulumu](https://docs.docker.com/engine/install/ubuntu/)
