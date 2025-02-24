# Runing with source codes

You can run following command to run an application

```
npm run start <app name>
```

You can look at the folders under the "apps" folder for application names. The most basic applications at the moment are as follows

- **Users** - Allows the user to become a member and log in, keeps and manages roles and entity ownerships. Uses Kafka, TCP and Rest API.

- **Files** - File service uploads with the help of Rest API and provides file validation with TCP communication.

- **Notify** - Keeps the necessary templates for email and prepares emails from these templates and sends them. Uses Kafka and Rest API.

Each of these applications can be run in a separate terminal as follows:

```
npm run start users
npm run start files
npm run start notify
npm run start ...
```