const OktaJwtVerifier = require("@okta/jwt-verifier"),
  okta = require("@okta/okta-sdk-nodejs"),
  axios = require("axios"),;

const oktaClient = new okta.Client({
  orgUrl: process.env["oktaurl"],
  token: process.env["oktaapiKey"]
});

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env["oktaissuer"],
  clientId: process.env["oktaclientId"]
});



const oktaHeader = {
  Authorization: `SSWS ${process.env["oktaapiKey"]}`
};

const getAppUsers = async () => {
  const queryUrl = `${process.env["oktaurl"]}/api/v1/apps/${process.env[
    "oktaclientId"
  ]}/users`;
  let { data } = await axios.get(queryUrl, { headers: oktaHeader });
  return data;
};

module.exports = {
  oktaJwtVerifier,
  oktaClient,
  getAppUsers
};
