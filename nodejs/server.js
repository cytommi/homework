"use strict";

const Hapi = require("@hapi/hapi");
const { getMapData } = require("./MapData");

const server = new Hapi.Server({
  port: 3000,
  host: "0.0.0.0",
});

server
  .register([{ plugin: require("@hapi/inert") }])
  .then(getMapData)
  .then((mapData) => {
    server.route({
      method: "GET",
      path: "/",
      handler: function (_request, h) {
        return h.file("ui/index.html");
      },
    });

    server.route({
      method: "GET",
      path: "/map-data",
      handler: function (_request) {
        return mapData;
      },
    });

    server.route({
      method: "GET",
      path: "/app.js",
      handler: function (_request, h) {
        return h.file("ui/app.js");
      },
    });

    server.route({
      method: "GET",
      path: "/node_modules/{param*}",
      handler: {
        directory: {
          path: "node_modules",
          listing: false,
          index: true,
        },
      },
    });

    return server.start();
  })
  .then(() => {
    console.log("Server started");
  })
  .catch(() => {
    console.warn("An unexpected error occured.");
    process.exit(-1);
  });
