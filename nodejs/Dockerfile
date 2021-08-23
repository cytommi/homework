FROM node:12-alpine

RUN mkdir -p /srv/maryland_app/node_modules && chown -R node:node /srv/maryland_app

WORKDIR /srv/maryland_app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 3000

CMD [ "node", "server.js" ]
