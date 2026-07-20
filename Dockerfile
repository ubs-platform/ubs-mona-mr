ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.docker.json package-lock.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . .
ARG APP_NAME
RUN test -n "${APP_NAME}"
RUN npm run build -- ${APP_NAME}
RUN npm prune --omit=dev --legacy-peer-deps && npm cache clean --force

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
ARG APP_NAME
RUN test -n "${APP_NAME}"
COPY --from=build /app/package.docker.json /app/package.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist/apps/${APP_NAME} /app
CMD ["node", "/app/main.js"]
