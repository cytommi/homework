"use strict";

const Hapi = require("@hapi/hapi");
const rp = require("request-promise");

/**
 * @descritipn fetch State of Maryland Payment Data from https://opendata.maryland.gov/resource/7syw-q4cy.json
 * @returns Promise<{vendor_zip: string, total_amount: string}[]>
 */
async function fetchStateOfMarylandPaymentData(
  { fiscalYear, numTopEntries } = { fiscalYear: 2015, numTopEntries: 3 }
) {
  function sanitizeZipcode(zipCodeStr) {
    const LENGTH_OF_ZIP_CODE = 5;
    if (zipCodeStr.length === LENGTH_OF_ZIP_CODE) {
      return zipCodeStr;
    }
    const numberOfZerosToPrepend = LENGTH_OF_ZIP_CODE - zipCodeStr.length;
    const zeroes = new Array(numberOfZerosToPrepend)
      .fill(null)
      .map((_) => "0")
      .join("");
    return `${zeroes}${zipCodeStr}`;
  }
  try {
    const queryParams = {
      $select: `vendor_zip, sum(amount) as total_amount`,
      $where: `fiscal_year=${fiscalYear}`,
      $group: `vendor_zip`,
      $order: `total_amount`,
    };
    const fetchResult = await rp({
      method: "GET",
      uri: "https://opendata.maryland.gov/resource/7syw-q4cy.json",
      qs: queryParams,
      json: true,
    });

    const zipCodesWithTopSpending = fetchResult
      .slice(-numTopEntries)
      .map(({ vendor_zip, total_amount }) => ({
        vendorZip: sanitizeZipcode(vendor_zip),
        totalAmount: total_amount,
      }));

    return zipCodesWithTopSpending;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function mapZipCodesToCoordinates(data) {
  async function delay(ms = 1010) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function fetchUnitedStatesPostalCodeCoordinatesAPI(postalCode) {
    const apiUrl = "https://nominatim.openstreetmap.org/search";
    return rp({
      headers: {
        "User-Agent": "Maryland App",
      },
      uri: apiUrl,
      method: "GET",
      qs: {
        format: "json",
        postalcode: postalCode,
        country: "United States",
      },
      json: true,
    });
  }
  const result = [];

  for (const { vendorZip, totalAmount } of data) {
    await delay();
    const fetchCoordinatesResult = (
      await fetchUnitedStatesPostalCodeCoordinatesAPI(vendorZip)
    )[0];
    result.push({
      vendorZip,
      totalAmount,
      longitude: fetchCoordinatesResult.lon,
      latitude: fetchCoordinatesResult.lat,
    });
  }
  return result;
}

const server = new Hapi.Server({
  port: 3000,
  host: "0.0.0.0",
});

server
  .register([{ plugin: require("@hapi/inert") }])
  .then(fetchStateOfMarylandPaymentData)
  .then(mapZipCodesToCoordinates)
  .then((zipCodesWithTopSpending) => {
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
        return zipCodesWithTopSpending;
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
    console.warn("An error occured.");
    process.exit(-1);
  });
