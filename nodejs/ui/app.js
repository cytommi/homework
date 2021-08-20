"use strict";

(function () {
  var app = angular.module("immuta.homework", ["ui-leaflet"]);

  function MapController($scope, leafletData) {
    function fetchMapData() {
      return fetch("/map-data");
    }

    leafletData.getMap().then(function (map) {
      console.log({ map });
      L.GeoIP.centerMapOnPosition(map, 15);
    });

    fetchMapData()
      .then((result) => result.json())
      .then((data) => {
        data.forEach(({ longitude, latitude }) => {
          leafletData.getMap("map-simple-map").then(function (map) {
            L.marker(L.latLng(latitude, longitude)).addTo(map);
          });
        });
      });
  }

  MapController.$inject = ["$scope", "leafletData"];
  app.controller("MapController", MapController);
})();
