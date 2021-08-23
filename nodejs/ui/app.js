"use strict";

(function () {
  var app = angular.module("immuta.homework", ["ui-leaflet"]);

  MapController.$inject = ["$scope", "leafletData"];
  app.controller("MapController", MapController);

  function MapController($scope, leafletData) {
    function fetchMapData() {
      return fetch("/map-data");
    }

    fetchMapData()
      .then((result) => result.json())
      .then((data) => {
        data.forEach(({ longitude, latitude }) => {
          leafletData.getMap("map-simple-map").then(function (map) {
            L.marker(L.latLng(latitude, longitude)).addTo(map);
          });
        });
      })
      .catch(() => {
        console.warn("An error occurred when mapping zip code coordinates");
      });
  }
})();
