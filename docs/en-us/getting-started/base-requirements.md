# Basic requirements

The Mona platform requires these packages

- MongoDB
- Kafka

You can get these packages with the [docker-compose file under the infrastructure folder](../../../infrastructure/docker-compose.yml).

```bash
cd infrastructure
docker compose up -d
# Depending on how fast Zookeeper is getting up, you may need to restart it after a few seconds
```

If you do not have docker installed on your system, you can read this guide:

[Installing Docker on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

[Installing Docker on Common Linux distrubitions](https://docs.docker.com/engine/install/ubuntu/)