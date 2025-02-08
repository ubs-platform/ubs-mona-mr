# Uygulamayı çalıştırma

- Oluşturduğunuz uygulamayı çalıştırma

```
nest start users
```

- Eğer .env dosyanız varsa aşağıdaki komutu da kullanabilirsiniz

```
export $(cat .env | xargs) && nest start users
```
