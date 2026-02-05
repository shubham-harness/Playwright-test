const RelicxSDK = require("../../src/relicxSdk");

const setupRelicxCommands = (Cypress) => {
  Cypress.Commands.add("relicxFaker", (description) => {
    const API_KEY = Cypress.env("RELICX_API_KEY");
    const API_ENDPOINT = Cypress.env("RELICX_API_ENDPOINT");
    const relicx = new RelicxSDK(API_KEY, API_ENDPOINT);
    return cy
      .wrap(relicx.faker(description), { timeout: 30000 })
      .then((response) => {
        return response;
      });
  });
  Cypress.Commands.add("relicxAnswer", (question) => {
    const API_KEY = Cypress.env("RELICX_API_KEY");
    const API_ENDPOINT = Cypress.env("RELICX_API_ENDPOINT");
    const relicx = new RelicxSDK(API_KEY, API_ENDPOINT);

    const screenshotFileName = "relicxAnswerScreenshot";

    return cy.screenshot(screenshotFileName).then(() => {
      return cy
        .readFile(`cypress/screenshots/${screenshotFileName}.png`, "base64")
        .then((screenshotBase64) => {
          return cy
            .wrap(relicx.answer(question, screenshotBase64, cy.url()), {
              timeout: 30000,
            })
            .then((response) => {
              return cy
                .task(
                  "deleteFile",
                  `cypress/screenshots/${screenshotFileName}.png`
                )
                .then(() => {
                  return response;
                });
            });
        });
    });
  });
};

module.exports = { setupRelicxCommands };
