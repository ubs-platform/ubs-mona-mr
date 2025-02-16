FROM node:20.11.0-alpine AS build
ARG APP_NAME
# COPY package.json  package-lock.json ./
COPY . ./
RUN echo appname: ${APP_NAME}
RUN npm install
RUN npx nest build ${APP_NAME}

FROM node:20.11.0-alpine
ARG APP_NAME
WORKDIR /app
COPY --from=build /app/dist/apps/${APP_NAME} /app
COPY --from=build /app/node_modules /app/node_modules
CMD ["node", "/app/main.js"]
