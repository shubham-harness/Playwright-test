const axios = require('axios');

class RelicxSDK {
  constructor(apiKey, apiEndpoint) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint || "https://app.relicx.ai";
  }

  /**
   * Generate a fake value based on the given description
   * @param {string} description : Describe in natural language what you want to fake. Example "name", "password_with_one_capital_letter". Make sure there are no spaces in description.
   * @returns {string} faked value that matches the description
   */
  async faker(description) {
    try {
      const urlEncodedDescription = encodeURIComponent(description);
      const url = `${this.apiEndpoint}/api/v1/testNew/testrun/fakerValue?faker=${urlEncodedDescription}&code=${this.apiKey}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching faked value: ${error.message}`);
      throw error;
    }
  }

  /**
   * Answer the question based on the provided screenshot
   * @param {string} question 
   * @param {string} screenshotBase64 : base6 encoded string for the screenshot of the page
   * @returns 
   * {
   *   explanation: string;
   *   answer: boolean;
   *   confidence: number;
   * }
   */
  async answer(question, screenshotBase64, currentUrl, html) {
    try {
      const urlEncodedQuestion = encodeURIComponent(question);
      const urlEncodedCurrentUrl = encodeURIComponent(currentUrl);
      const url = `${this.apiEndpoint}/api/v1/testNew/assert?question=${urlEncodedQuestion}&code=${this.apiKey}&url=${urlEncodedCurrentUrl}`;
      const payload = { screenshot: screenshotBase64 };
      if (typeof html === 'string' && html.length > 0) {
        payload.html = html;
      }
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      console.error(`Error computing assertion: ${error.message}`);
      throw error;
    }
  }
  
/**
 * Use this to get answers for both Playwright and Puppeteer
 * @param {*} question : natural language question about the page
 * @param {*} page : page object from either Playwright or Puppeteer
 * @return {answer: boolean, explanation: string} : Answer with explanation
 */
async answerForPage(question, page) {
  // Take a screenshot
  let screenshotBase64;
  if (typeof page.screenshot === 'function') {
    const screenshotBuffer = await page.screenshot({ encoding: 'base64' });
    if (Buffer.isBuffer(screenshotBuffer)) {
      screenshotBase64 = screenshotBuffer.toString('base64');
    } else {
      screenshotBase64 = screenshotBuffer; // For Puppeteer, it might already be a base64 string
    }
  } else {
    throw new Error("The provided page object does not support the screenshot function.");
  }

  // Get the page URL
  let pageUrl;
  if (typeof page.url === 'function') {
    pageUrl = page.url();
  } else if (typeof page.evaluate === 'function') {
    pageUrl = await page.evaluate(() => window.location.href);
  } else {
    throw new Error("The provided page object does not support the url function.");
  }

  let pageHtml;
  try {
    if (typeof page.content === 'function') {
      pageHtml = await page.content();
    } else if (typeof page.evaluate === 'function') {
      pageHtml = await page.evaluate(() => document.documentElement.outerHTML);
    }
  } catch (error) {
    console.error(`Error getting page HTML: ${error.message}.  HTML will not be used for assertion.`);
  }

  // Return the answer
  return this.answer(question, screenshotBase64, pageUrl, pageHtml);
}

  async task(task) {
    // coming soon
  }

  async extractData(dataDescription) {
    // coming soon
  }
}

module.exports = RelicxSDK;
