ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY . ./
RUN npm install
ARG APP_NAME
RUN test -n "${APP_NAME}"
RUN npm run build ${APP_NAME}

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
COPY package.json package.json
RUN npm install --production
ARG APP_NAME
RUN test -n "${APP_NAME}"
COPY --from=build /app/dist/apps/${APP_NAME} /app
CMD ["node", "/app/main.js"]
