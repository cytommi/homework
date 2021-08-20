FROM node:12-alpine

WORKDIR /srv/maryland_app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "server.js" ]
