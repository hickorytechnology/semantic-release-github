import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import { Octokit } from '@octokit/rest';
import createHttpProxyAgent, { HttpProxyAgent, HttpProxyAgentOptions } from 'http-proxy-agent';
import createHttpsProxyAgent, { HttpsProxyAgent, HttpsProxyAgentOptions } from 'https-proxy-agent';
import urljoin from 'url-join';
import { RETRY_CONF } from '../definitions/rate-limit';

export function getClient(
  githubToken: string,
  githubUrl: string,
  githubApiPathPrefix: string,
  proxy: { enabled: boolean; options: string | HttpProxyAgentOptions | HttpsProxyAgentOptions }
): Octokit {
  const baseUrl: string = githubUrl && urljoin(githubUrl, githubApiPathPrefix);

  let proxyConfig: HttpProxyAgent | HttpsProxyAgent | undefined;
  if (proxy.enabled) {
    if (proxy.options) {
      proxyConfig =
        baseUrl != null && new URL(baseUrl).protocol.replace(':', '') === 'http'
          ? createHttpProxyAgent(proxy.options)
          : createHttpsProxyAgent(proxy.options);
    }
  }

  const MyOctokit = Octokit.plugin(throttling, retry);
  return new MyOctokit({
    // log: console,
    auth: `token ${githubToken}`,
    baseUrl,
    request: {
      agent: proxyConfig,
      retries: RETRY_CONF.retries,
      timeout: RETRY_CONF.minTimeout,
    },
    retry: {
      doNotRetry: [400, 401, 403],
    },
    throttle: {
      onRateLimit: (retryAfter: number, options: Record<string, any>, octokit: Octokit): boolean => {
        octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);

        if (options.request.retryCount === RETRY_CONF.retries - 1) {
          // only retries three times
          octokit.log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }

        return false;
      },
      onAbuseLimit: (_retryAfter: number, options: Record<string, any>, octokit: Octokit): void => {
        // does not retry, only logs a warning
        octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
      },
    },
  });
}
