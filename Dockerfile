FROM node:20-alpine AS build
ARG APP_NAME
# COPY package.json  package-lock.json ./
COPY . ./
RUN echo appname: ${APP_NAME}
RUN npm install
RUN npm run build ${APP_NAME}

FROM node:20-alpine
ARG APP_NAME
WORKDIR /app
COPY --from=build /app/dist/apps/${APP_NAME} /app
COPY --from=build /app/package.json /app/package.json
RUN npm install --production
CMD ["node", "/app/main.js"]
