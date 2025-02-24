# Running packages using docker compose
You can use the [docker-compose-full.yml](../../../infrastructure/docker-compose-full.yml) under the infrastructure folder to get all docker images of this repository

```
cd infrastructure
docker compose -f docker-compose-full.yml up -d
```

## Important notes

- The version in the file may be different from the current version. In this case, in lines like `hcangunduz/ubs-mona-files:5.0.5-beta`, where `5.0.5-beta` is written, you can look at the "version" and `iksir.childrenVersionTag` sections in the package json. If childrenVersionTag is empty, latest or stable, it will remain empty and the tag will be just `version`. Otherwise, the tag will be: "version-childrenVersionTag"