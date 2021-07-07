import { $log } from '@tsed/logger';
import { Context } from 'semantic-release';
import { RELEASE_NAME } from '../../definitions/constants';
import { PluginOptions } from '../../types/plugin-options';
import { getClient } from '../../utils/get-client';
import { isPrerelease } from '../../utils/is-prerelease';
import { parseGitHubUrl } from '../../utils/parse-github-url';
import { resolveConfig } from '../../utils/resolve-config';

export async function addChannelGitHub(pluginOptions: PluginOptions, context: Context | any): Promise<any> {
  const {
    options: { repositoryUrl },
    branch,
    nextRelease: { name, gitTag, notes },
    logger,
  } = context;
  const { githubToken, githubUrl, githubApiPathPrefix, proxy } = resolveConfig(pluginOptions, context);
  const { owner, repo } = parseGitHubUrl(repositoryUrl);
  const github = getClient(githubToken, githubUrl, githubApiPathPrefix, proxy);
  let releaseId;

  if (owner === undefined || repo === undefined) {
    throw new Error(`Could not parse the owner or repo from ${repositoryUrl}`);
  }

  const release = { owner, repo, name, prerelease: isPrerelease(branch), tag_name: gitTag };

  $log.debug('release object: %O', release);

  try {
    ({
      data: { id: releaseId },
    } = await github.repos.getReleaseByTag({ owner, repo, tag: gitTag }));
  } catch (error) {
    if (error.status === 404) {
      logger.log('There is no release for tag %s, creating a new one', gitTag);

      const {
        data: { html_url: url },
      } = await github.repos.createRelease({ ...release, body: notes });

      logger.log('Published GitHub release: %s', url);
      return { url, name: RELEASE_NAME };
    }

    throw error;
  }

  $log.debug('release release_id: %o', releaseId);

  const {
    data: { html_url: url },
  } = await github.repos.updateRelease({ ...release, release_id: releaseId });

  logger.log('Updated GitHub release: %s', url);

  return { url, name: RELEASE_NAME };
}
