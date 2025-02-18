# Creating a library

You can create a new library with this command

```
nest generate lib <library name>
```

And then to make it publishable via npm and usable by other libraries, run `npm run xr libs/<library name>`. This will implement items 2 and 3 of the library requirements. However, item 1 must be followed to avoid any further problems.

**Library requirements**

1 - **All exports should be done via `index.ts`** and also other libraries should be imported as **@ubs-platform/library-name**.

2 - Each library should have 3 files. package.json, tsconfig-lib.json and tsconfi-lib-publish.json

- @ubs-platform/\*\*\* should be excluded in publish json.

3 - In package, the library's path in typescript should start as @ubs-platform/... or at least the package name and typescript path should be the same. Similarly, there should be a section for xr

```
    "iksir": {
        "type": "LIBRARY",
        "libraryMode": "EMBEDDED"
    },
```

If the library will not be published, libraryMode should be `EMBED`. Otherwise, if it will be published on NPM, it should be `PEER`. For more detailed information, you can review the tools/src/\*\*.ts files.
