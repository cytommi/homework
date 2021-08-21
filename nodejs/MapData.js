const rp = require("request-promise");

// ms
const NOMINATIM_REQUEST_INTERVAL_LIMIT = 1000;

const DEFAULT_MARYLAND_PAYMENT_DATA_PARAMS = {
  numTopSpendingZipCodes: 3,
  fiscalYear: 2015,
};

exports.getMapData = async function () {
  const marylandPaymentData = await getZipCodesWithHighestTotalAmount();
  const coordinates = await getCoordinatesOf(marylandPaymentData);
  return coordinates;
};

async function getZipCodesWithHighestTotalAmount({
  fiscalYear,
  numTopSpendingZipCodes,
} = DEFAULT_MARYLAND_PAYMENT_DATA_PARAMS) {
  const rawPaymentDataOrderedByTotalAmount = await fetchMarylandPaymentDataAPI({
    $select: `vendor_zip, SUM(amount) AS total_amount`,
    $where: `fiscal_year=${fiscalYear}`,
    $group: `vendor_zip`,
    $order: `total_amount`,
  });
  const sanitizedPaymentDataOrderedByTotalAmount = sanitizePaymentData(
    rawPaymentDataOrderedByTotalAmount
  );

  // Make sure we have enough data to return specified number of zip codes
  const result =
    sanitizedPaymentDataOrderedByTotalAmount.length <= numTopSpendingZipCodes
      ? sanitizedPaymentDataOrderedByTotalAmount
      : sanitizedPaymentDataOrderedByTotalAmount.slice(-numTopSpendingZipCodes);

  return result;

  async function fetchMarylandPaymentDataAPI(queryParams = {}) {
    return rp({
      method: "GET",
      uri: "https://opendata.maryland.gov/resource/7syw-q4cy.json",
      qs: queryParams,
      json: true,
    });
  }

  function sanitizePaymentData(paymentData) {
    function isValidZipCode(str) {
      const regexp = /^[0-9]{5}$/;
      return regexp.test(str);
    }
    return paymentData.filter((entry) => isValidZipCode(entry.vendor_zip));
  }
}

async function getCoordinatesOf(paymentData) {
  const result = [];
  for (const { vendor_zip, total_amount } of paymentData) {
    await delay(NOMINATIM_REQUEST_INTERVAL_LIMIT + 10);
    const fetchCoordinatesResult = await fetchZipCodeCoordinatesAPI(vendor_zip);

    if (!fetchCoordinatesResult || fetchCoordinatesResult.length === 0) {
      console.warn(`Cannot find coordinates of vendor_zip: ${vendor_zip}`);
      continue;
    }

    if (fetchCoordinatesResult.length > 1) {
      console.warn(
        `Received multiple coordinates for vendor_zip: ${vendor_zip}`
      );
      continue;
    }

    result.push({
      vendorZip: vendor_zip,
      totalAmount: total_amount,
      longitude: fetchCoordinatesResult[0].lon,
      latitude: fetchCoordinatesResult[0].lat,
    });
  }
  return result;

  async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchZipCodeCoordinatesAPI(zipCode) {
    return rp({
      headers: {
        "User-Agent": "Maryland App",
      },
      method: "GET",
      uri: "https://nominatim.openstreetmap.org/search",
      qs: {
        format: "json",
        postalcode: zipCode,
        country: "United States",
      },
      json: true,
    });
  }
}
