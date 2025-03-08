import fetch, { Response, RequestInfo, RequestInit } from 'node-fetch';

/**
 * Sleep for a specified number of milliseconds
 * @param ms Number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry functionality
 * This function extends fetch to allow retrying
 * If the request returns a 429 error code, it will wait and retry after "retry_after" seconds
 * 
 * @param input Request info
 * @param init Request init options
 * @param nRetries Number of retries (default: 3)
 * @returns Response from the fetch
 */
export async function fetchAndRetry(
  input: string | URL,
  init?: RequestInit,
  nRetries = 3,
): Promise<Response> {
  try {
    // Make the request
    const response = await fetch(input, init);

    // If there's a 429 error code, retry after retry_after seconds
    // https://discord.com/developers/docs/topics/rate-limits#rate-limits
    if (response.status === 429 && nRetries > 0) {
      const retryAfter = Number(response.headers.get('retry-after'));
      if (Number.isNaN(retryAfter)) {
        return response;
      }
      await sleep(retryAfter * 1000);
      return await fetchAndRetry(input, init, nRetries - 1);
    }
    return response;
  } catch (ex) {
    if (nRetries <= 0) {
      throw ex;
    }

    // If the request failed, wait one second before trying again
    // This could probably be fancier with exponential backoff
    await sleep(1000);
    return await fetchAndRetry(input, init, nRetries - 1);
  }
}