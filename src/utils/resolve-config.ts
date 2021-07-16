import { castArray } from 'lodash';
import { Context } from 'semantic-release';
import { PluginOptionInputs, PluginOptions } from '../types/plugin-options';

export function resolveConfig(config: Partial<PluginOptionInputs>, context: Context): PluginOptions {
  const { env } = context;
  return {
    githubToken: env.GH_TOKEN || env.GITHUB_TOKEN,
    githubUrl: config.githubUrl || env.GITHUB_API_URL || env.GH_URL || env.GITHUB_URL,
    githubApiPathPrefix: config.githubApiPathPrefix || env.GH_PREFIX || env.GITHUB_PREFIX || '',
    proxy: {
      enabled: config.proxy?.enabled ?? false,
      options: config.proxy?.options == null ? env.http_proxy || env.HTTP_PROXY : config.proxy.options,
    },
    assets: config.assets ? castArray(config.assets) : [],
    assignees: config.assignees ? castArray(config.assignees) : [],
    successComment: {
      enabled: config.successComment?.enabled ?? false,
      comment: config.successComment?.comment ?? '',
    },
    failComment: {
      enabled: config.failComment?.enabled ?? false,
      failTitle:
        config.failComment?.failTitle == null
          ? 'The automated release is failing 🚨'
          : config.failComment.failTitle,
      comment: config.failComment?.comment ?? '',
    },
    addFailLabels: false,
    failLabels: {
      enabled: config.failLabels?.enabled ?? true,
      labels: config.failLabels?.labels == null ? ['semantic-release'] : castArray(config.failLabels.labels),
    },
    releasedLabels: {
      enabled: config.releasedLabels?.enabled ?? false,
      labels:
        config.releasedLabels?.labels == null
          ? ['released<%= nextRelease.channel ? ` on @${nextRelease.channel}` : "" %>']
          : castArray(config.releasedLabels.labels),
    },
    addReleases: config.addReleases == null ? false : config.addReleases,
  };
}
