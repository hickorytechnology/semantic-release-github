import nock from 'nock';

/**
 * Return a `nock` object setup to respond to a github authentication request. Other expectation and responses can be chained.
 *
 * @param env Environment variables.
 * @param githubToken The github token to return in the authentication response.
 * @param githubUrl The url on which to intercept http requests.
 * @param githubApiPathPrefix The GitHub Enterprise API prefix.
 * @return A `nock` object ready to respond to a github authentication request.
 */
export function authenticate(
  env: Record<string, any> = {},
  {
    githubToken = env.GH_TOKEN || env.GITHUB_TOKEN || 'GH_TOKEN',
    githubUrl = env.GITHUB_API_URL || env.GH_URL || env.GITHUB_URL || 'https://api.github.com',
    githubApiPathPrefix = env.GH_PREFIX || env.GITHUB_PREFIX || '',
  } = {}
): nock.Scope {
  return nock(`${githubUrl}/${githubApiPathPrefix}`, {
    reqheaders: { Authorization: `token ${githubToken}` },
  });
}

/**
 * Return a `nock` object setup to respond to a github release upload request. Other expectation and responses can be chained.
 *
 * @param env Environment variables.
 * @param githubToken The github token to return in the authentication response.
 * @param uploadUrl The url on which to intercept http requests.
 * @return A `nock` object ready to respond to a github file upload request.
 */
export function upload(
  env: Record<string, any> = {},
  {
    githubToken = env.GH_TOKEN || env.GITHUB_TOKEN || 'GH_TOKEN',
    uploadUrl,
    contentType = 'text/plain',
    contentLength,
  }: Record<string, any> = {}
): nock.Scope {
  return nock(uploadUrl, {
    reqheaders: {
      Authorization: `token ${githubToken}`,
      'content-type': contentType,
      'content-length': contentLength,
    },
  });
}

export default { authenticate, upload };
