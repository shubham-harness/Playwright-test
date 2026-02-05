import axios from 'axios';
import RelicxSDK from './relicxSdk';

// Mock axios
jest.mock('axios');

describe('RelicxSDK', () => {
  const apiEndpoint = 'http://example.com';
  const apiKey = 'test-api-key';
  let sdk;

  beforeEach(() => {
    sdk = new RelicxSDK(apiEndpoint, apiKey);
  });

  it('should return faked value from the API', async () => {
    const description = 'name';
    const fakedValue = 'John Doe';
    axios.get.mockResolvedValue({ data: { fakedValue } });

    const result = await sdk.faker(description);

    expect(axios.get).toHaveBeenCalledWith(`${apiEndpoint}/api/v1/testrun/fakerValue?faker=${description}&code=${apiKey}`);
    expect(result).toBe(fakedValue);
  });

  it('should throw an error if the API request fails', async () => {
    const description = 'name';
    const errorMessage = 'Network Error';
    axios.get.mockRejectedValue(new Error(errorMessage));

    await expect(sdk.faker(description)).rejects.toThrow(errorMessage);
  });
});
