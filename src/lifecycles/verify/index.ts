import AggregateError from 'aggregate-error';
import { isArray, isString } from 'lodash';
import { Context } from 'semantic-release';
import urlJoin from 'url-join';
import { PluginOptions } from '../../types/plugin-options';
import { getClient } from '../../utils/get-client';
import { getError } from '../../utils/get-error';
import { parseGitHubUrl } from '../../utils/parse-github-url';
import { resolveConfig } from '../../utils/resolve-config';

const isNonEmptyString = (value: unknown) => isString(value) && value.trim();
const oneOf = (enumArray: any[]) => (value: unknown) => enumArray.some((element) => element === value);
// eslint-disable-next-line max-len
const isStringOrStringArray = (value: unknown) =>
  isNonEmptyString(value) || (isArray(value) && value.every((string) => isNonEmptyString(string)));
const isArrayOf = (validator: (v: unknown) => boolean) => (array: unknown) =>
  isArray(array) && array.every((value) => validator(value));
const canBeDisabled = (validator: (v: unknown) => boolean) => (value: boolean) =>
  value === false || validator(value);

const VALIDATORS: Record<string, any> = {
  proxy: {},
};

export async function verifyGitHub(pluginOptions: PluginOptions, context: Context): Promise<void> {
  const { env, options, logger } = context;
  const repositoryUrl = options === undefined ? '' : options.repositoryUrl;
  const { githubToken, githubUrl, githubApiPathPrefix, proxy } = resolveConfig(pluginOptions, context);
  const errors: any[] = [];
  // const errors = Object.entries({ ...options, proxy }).reduce(
  //   (errs, [option, value]) => (value != null && !VALIDATORS[option](value)
  //     ? [...errors, getError(`EINVALID${option.toUpperCase()}`, { [option]: value })]
  //     : errors),
  //   [],
  // );

  if (githubUrl) {
    logger.log('Verify GitHub authentication (%s)', urlJoin(githubUrl, githubApiPathPrefix));
  } else {
    logger.log('Verify GitHub authentication');
  }

  const { repo, owner } = parseGitHubUrl(repositoryUrl);
  if (!owner || !repo) {
    errors.push(getError('EINVALIDGITHUBURL'));
  } else if (githubToken && !errors.find(({ code }) => code === 'EINVALIDPROXY')) {
    const github = getClient(githubToken, githubUrl, githubApiPathPrefix, proxy);

    // https://github.com/semantic-release/github/issues/182
    // Do not check for permissions in GitHub actions, as the provided token is an installation access token.
    // github.repos.get({repo, owner}) does not return the "permissions" key in that case. But GitHub Actions
    // have all permissions required for @semantic-release/github to work
    if (env.GITHUB_ACTION) {
      return;
    }

    try {
      const repos = await github.repos.get({ repo, owner });
      if (!repos.data.permissions?.push) {
        // If authenticated as GitHub App installation, `push` will always be false.
        // We send another request to check if current authentication is an installation.
        // Note: we cannot check if the installation has all required permissions, it's
        // up to the user to make sure it has
        if (await github.request('HEAD /installation/repositories', { per_page: 1 }).catch(() => false)) {
          return;
        }

        errors.push(getError('EGHNOPERMISSION', { owner, repo }));
      }
    } catch (error) {
      if (error.status === 401) {
        errors.push(getError('EINVALIDGHTOKEN', { owner, repo }));
      } else if (error.status === 404) {
        errors.push(getError('EMISSINGREPO', { owner, repo }));
      } else {
        throw error;
      }
    }
  }

  if (!githubToken) {
    errors.push(getError('ENOGHTOKEN', { owner, repo }));
  }

  if (errors.length > 0) {
    throw new AggregateError(errors);
  }
}
