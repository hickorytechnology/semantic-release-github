import { castArray, defaultTo } from 'lodash';
import { Context } from 'semantic-release';
import { addChannelGitHub } from './lifecycles/add-channel';
import { failGitHub } from './lifecycles/fail';
import { publishGitHub } from './lifecycles/publish';
import { SuccessHandler } from './lifecycles/success';
import { verifyGitHub } from './lifecycles/verify';
import { PluginOptions } from './types/plugin-options';
import { loadEnv } from './utils/load-env';

loadEnv();

let verified: boolean;

async function verifyConditions(pluginOptions: PluginOptions, context: Context): Promise<void> {
  const { options } = context;
  const config = { ...pluginOptions };

  if (options === undefined) {
    throw new Error('Could not resolve semantic-release context options');
  }

  // If the GitHub publish plugin is used and has `assets`, `successComment`, `failComment`, `failTitle`, `labels` or `assignees`
  // configured, validate it now in order to prevent any release if the configuration is wrong.
  if (options.publish) {
    const publishPlugin =
      castArray(options.publish).find((publishOpts) => {
        if (publishOpts.path == null || publishOpts.path === '') {
          return false;
        }
        return publishOpts.path === '@semantic-release/github';
      }) || {};

    config.assets = defaultTo(pluginOptions.assets, publishPlugin.assets);
    config.successComment = defaultTo(pluginOptions.successComment, publishPlugin.successComment);
    config.failComment = defaultTo(pluginOptions.failComment, publishPlugin.failComment);
    config.failTitle = defaultTo(pluginOptions.failTitle, publishPlugin.failTitle);
    config.labels = defaultTo(pluginOptions.labels, publishPlugin.labels);
    config.assignees = defaultTo(pluginOptions.assignees, publishPlugin.assignees);
  }

  await verifyGitHub(config, context);
  verified = true;
}

async function publish(
  pluginOptions: PluginOptions,
  context: Context
): Promise<void | {
  url: string;
  name: string;
  id: number;
}> {
  if (!verified) {
    await verifyGitHub(pluginOptions, context);
    verified = true;
  }

  return publishGitHub(pluginOptions, context);
}

async function addChannel(pluginOptions: PluginOptions, context: Context): Promise<void> {
  if (!verified) {
    await verifyGitHub(pluginOptions, context);
    verified = true;
  }

  return addChannelGitHub(pluginOptions, context);
}

async function success(pluginOptions: PluginOptions, context: Context): Promise<void> {
  if (!verified) {
    await verifyGitHub(pluginOptions, context);
    verified = true;
  }
  await new SuccessHandler().handle(pluginOptions, context);
}

async function fail(pluginOptions: PluginOptions, context: Context): Promise<void> {
  if (!verified) {
    await verifyGitHub(pluginOptions, context);
    verified = true;
  }

  await failGitHub(pluginOptions, context);
}

module.exports = {
  verifyConditions,
  addChannel,
  publish,
  success,
  fail,
};
