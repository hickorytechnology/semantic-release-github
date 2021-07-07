import { parseURI } from 'uri-parse-lib';

export function parseGitHubUrl(repositoryUrl: string): Partial<{ owner: string; repo: string }> {
  const { host, pathname, user, password } = parseURI(repositoryUrl);
  try {
    const pathName = new URL(
      user != null && password != null ? `ssh://${user}:${password}@${host}/${pathname}` : repositoryUrl
    ).pathname;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [[path, owner, repo]] = [...pathName.matchAll(/^\/(?<owner>[^/]+)?\/?(?<repo>.+?)(?:\.git)?$/g)];

    return { owner, repo };
  } catch (err) {
    return {};
  }
}
