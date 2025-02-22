# FROM node:20-alpine AS build
FROM ubs_temp_workspace
ARG APP_NAME
# COPY package.json  package-lock.json ./
WORKDIR /app
COPY . ./
RUN npm run build ${APP_NAME}

FROM node:20-alpine
ARG APP_NAME
WORKDIR /app
COPY --from=build /app/dist/apps/${APP_NAME} /app
COPY --from=build /app/package.json /app/package.json
RUN npm install --production
CMD ["node", "/app/main.js"]
