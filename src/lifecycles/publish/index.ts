import { RestEndpointMethodTypes } from '@octokit/rest';
import { $log } from '@tsed/logger';
import { readFile, stat, Stats } from 'fs-extra';
import { template } from 'lodash';
import mime from 'mime';
import path from 'path';
import { Context } from 'semantic-release';
import { RELEASE_NAME } from '../../definitions/constants';
import { PluginOptions } from '../../types/plugin-options';
import { getClient } from '../../utils/get-client';
import { globAssets } from '../../utils/glob-assets';
import { isPrerelease } from '../../utils/is-prerelease';
import { parseGitHubUrl } from '../../utils/parse-github-url';
import { resolveConfig } from '../../utils/resolve-config';

export async function publishGitHub(
  pluginOptions: PluginOptions,
  context: Context | any // `any` since Context doesn't have types for cwd, and others
): Promise<{ url: string; name: string; id: number }> {
  const {
    cwd,
    options: { repositoryUrl },
    branch,
    nextRelease: { name, gitTag, notes },
    logger,
  } = context;
  const { githubToken, githubUrl, githubApiPathPrefix, proxy, assets } = resolveConfig(
    pluginOptions,
    context
  );
  const { owner, repo } = parseGitHubUrl(repositoryUrl);
  if (owner === undefined || repo === undefined) {
    throw new Error('JPS fix');
  }

  const github = getClient(githubToken, githubUrl, githubApiPathPrefix, proxy);
  const release: RestEndpointMethodTypes['repos']['createRelease']['parameters'] = {
    owner,
    repo,
    tag_name: gitTag,
    target_commitish: branch.name,
    name,
    body: notes,
    prerelease: isPrerelease(branch),
  };

  $log.debug('release object: %O', release);

  // When there are no assets, we publish a release directly
  if (!assets || assets.length === 0) {
    const {
      data: { html_url: url, id: releaseId },
    } = await github.repos.createRelease(release);

    logger.log('Published GitHub release: %s', url);
    return { url, name: RELEASE_NAME, id: releaseId };
  }

  // We'll create a draft release, append the assets to it, and then publish it.
  // This is so that the assets are available when we get a Github release event.
  const draftRelease = { ...release, draft: true };

  const {
    data: { upload_url: uploadUrl, id: releaseId },
  } = await github.repos.createRelease(draftRelease);

  // Append assets to the release
  const globbedAssets = await globAssets(context, assets);
  $log.debug('globed assets: %o', globbedAssets);

  await Promise.all(
    globbedAssets.map(async (asset) => {
      let filePath = '';
      if (Array.isArray(asset)) {
        [filePath] = asset;
      } else if (typeof asset === 'string') {
        filePath = asset;
      } else {
        filePath = asset.path;
      }

      let file: Stats;

      try {
        file = await stat(path.resolve(cwd, filePath));
      } catch {
        logger.error('The asset %s cannot be read, and will be ignored.', filePath);
        return;
      }

      if (!file || !file.isFile()) {
        logger.error('The asset %s is not a file, and will be ignored.', filePath);
        return;
      }

      let rawFileName: string = path.basename(filePath);
      if (!Array.isArray(asset) && typeof asset !== 'string') {
        rawFileName = asset.name;
      }

      const fileName = template(rawFileName)(context);

      $log.debug('file path: %o', filePath);
      $log.debug('file name: %o', fileName);

      const {
        data: { browser_download_url: downloadUrl },
      } = await github.repos.uploadReleaseAsset({
        baseUrl: uploadUrl,
        repo,
        owner,
        release_id: releaseId,
        name: fileName,
        data: (await readFile(path.resolve(cwd, filePath))) as any,
        headers: {
          'content-type': mime.getType(path.extname(fileName)) || 'text/plain',
          'content-length': file.size,
        },
        label:
          !Array.isArray(asset) && typeof asset !== 'string' && asset.label != null && asset.label !== ''
            ? template(asset.label)(context)
            : '',
      });
      logger.log('Published file %s', downloadUrl);
    })
  );

  const {
    data: { html_url: url },
  } = await github.repos.updateRelease({ owner, repo, release_id: releaseId, draft: false });

  logger.log('Published GitHub release: %s', url);
  return { url, name: RELEASE_NAME, id: releaseId };
}
