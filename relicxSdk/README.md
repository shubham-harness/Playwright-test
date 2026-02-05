# Relicx SDK

Relicx SDK provides natural language APIs that can assert application behavior, perform tasks by generating code, extract data from the application state, and fake data.

## APIs:
- **answer** : Answers question about the current page. You can ask any question and it will be answered based on the observed state of the page
    - Framework specific implementations:
      - For cypress use: ```cy.relicxAnswer(question)```
      - For playwright/puppeteer use: ```relicx.answerForPage(question, page)```
    - Examples:
      - Is user logged in?
      - Is the balance of family account more than 3000?
      - Is the chatbot response appropriate?
- **faker** : Generates a fake data based on the description. You can describe anything and it will generate a realistic value that can be used for test data
    - Framework specific implementations:
      - For cypress use: ```cy.relicxFaker(description)```
      - For playwright/puppeteer use: ```relicx.faker(description)```
    - Examples:
      - Fake Password with caps, numbers, and special characters: P@ssw0rd123(
      - Fake name:  Kiley Kautzer
      - Fake address:  3233 Oak Street, Anytown, CA 12345
      - Fake california county:  Santa Barbara
      - Fake unique id between 8 characters to 16 characters:  34567890123456


    Note the description must not have spaces (replace space with _). Example california county --> california_county


## Installation

To install the Relicx SDK, use npm:

```bash
npm install relicxsdk
```


## Generating API Key
You will need an API Key to use the relicx sdk. 
To create an API key:
- visit https://relicx.ai
- Create an account
- Login to your account
- Click on Settings > Generate API Key

## Playwright Usage, using RelicxSDK
To use the Relicx SDK, import it into your project:

```javascript
const { chromium } = require('playwright');
const { RelicxSDK } = require('relicxsdk');

(async () => {
  const API_KEY = 'API_KEY';
  const relicx = new RelicxSDK(API_KEY);

  // Generate a fake test data using relicx
  const fakePassword = await relicx.faker('password_with_capital_letters_and_numbers_and_special_character');
  console.log(`Fake Password: ${fakePassword}`);

  // Open browser so we can visit a page to questions about
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Visit the login page of a demo banking app
  await page.goto('http://prod.dbank.staging-apps.relicx.ai:8080/bank/login');

    // Answer a natural language question about the current page
  const response = await relicx.answerForPage('Is the user not logged in?', page);
  console.log(`Answer: ${response.answer}`);
  console.log(`Explanation: ${response.explanation}`);
  console.log(`Confidence: ${response.confidence}`);
})();
```

## Cypress Usage using Relicx Plugin
Relicx package contains a cypress plugin that makes it easy to use relicx sdk in cypress

### How to set up relicx plugin:
- Update `cypress.config.js`
```
  env: {
    RELICX_API_KEY: "API_KEY",
  },

  e2e: {
    setupNodeEvents(on, config) {
      const { relicxTasks } = require('relicxsdk');
      relicxTasks(on);
    },
  },
```

- Update the `cypress/support/commands.js`
```javascript
const { setupRelicxCommands } = require('relicxsdk');
setupRelicxCommands(Cypress);
```

### Using the relicx plugin in e2e tests
Sample code that generates a fake name and checks if user is not logged in
```javascript
describe("sample usage of relicx plugin", () => {
  it("passes", async () => {

    // generate a fake name
    cy.relicxFaker("password_with_capital_letters_and_numbers_and_special_character").then((response)=> {
      cy.log(`FAKE PASSWORD: ${response}`);
    });

    // Visit the login page
    cy.visit("http://prod.dbank.staging-apps.relicx.ai:8080/bank/login");

    // answer a question based on current state of the page
    cy.relicxAnswer("Is the user not logged in?").then((response) => {
      cy.log(`Answer: ${response.answer}`);
      cy.log(`Explanation: ${response.explanation}`);
      cy.log(`Confidence: ${response.confidence}`);
    });
  });
});
```