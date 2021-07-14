import { parseURI } from 'uri-parse-lib';

export function parseGitHubUrl(repositoryUrl: string): Partial<{ owner: string; repo: string }> {
  // const { host, pathname, user, password } = parseURI(repositoryUrl);
  const [match, auth, host, path] =
    /^(?!.+:\/\/)(?:(?<auth>.*)@)?(?<host>.*?):(?<path>.*)$/.exec(repositoryUrl) || [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, owner, repo] = /^\/(?<owner>[^/]+)?\/?(?<repo>.+?)(?:\.git)?$/.exec(
      new URL(match ? `ssh://${auth ? `${auth}@` : ''}${host}/${path}` : repositoryUrl).pathname
    )!;
    return { owner, repo };
  } catch (err) {
    return {};
  }
}
