import { $log } from '@tsed/logger';
import { cleanAll } from 'nock';
import { Context, GlobalConfig, NextRelease } from 'semantic-release';
import { addChannelGitHub } from '../../../src/lifecycles/add-channel';
import { resolveConfig } from '../../../src/utils/resolve-config';
import { authenticate } from '../../helpers/mock-github';

/* eslint camelcase: ["error", {properties: "never"}] */

jest.mock('@tsed/logger');

afterEach(() => {
  // Clear nock
  cleanAll();
});

test('Update a release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` } as GlobalConfig;
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Updated GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Update a maintenance release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', channel: '1.x', notes: 'Test release note body' } as
    | NextRelease
    | any; // TODO why is `channel` not available
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'maintenance', channel: '1.x', main: false },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Updated GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Update a prerelease', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'maintenance', channel: '1.x', main: false },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Updated GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Update a release with a custom github url', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_URL: 'https://othertesturl.com:443', GH_TOKEN: 'github_token', GH_PREFIX: 'prefix' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `${env.GH_URL}/${owner}/${repo}.git` };
  const releaseUrl = `${env.GH_URL}/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Updated GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test.skip('Update a release, retrying 4 times', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .times(3)
    .reply(404)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .times(3)
    .reply(500)
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Updated GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test.skip('Create the new release if current one is missing', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .times(4)
    .reply(404)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(200, { html_url: releaseUrl });

  const result = await addChannelGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('There is no release for tag %s, creating a new one', nextRelease.gitTag);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test.skip('Throw error if cannot read current release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .times(4)
    .reply(500);

  await expect(addChannelGitHub(pluginConfig, context)).resolves.toThrow();

  // t.is(error.status, 500); // TODO get status code from error
  expect(github.isDone()).toBe(true);
});

test.skip('Throw error if cannot create missing current release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .times(4)
    .reply(404)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      body: nextRelease.notes,
      prerelease: false,
    })
    .times(4)
    .reply(500);

  await expect(addChannelGitHub(pluginConfig, context)).resolves.toThrow();

  // t.is(error.status, 500); // TODO get status code from error
  expect(github.isDone()).toBe(true);
});

test.skip('Throw error if cannot update release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseId = 1;

  const context: Context | any = {
    env,
    options,
    branch: { type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}/releases/tags/${nextRelease.gitTag}`)
    .reply(200, { id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      tag_name: nextRelease.gitTag,
      prerelease: false,
    })
    .times(4)
    .reply(404);

  await expect(addChannelGitHub(pluginConfig, context)).resolves.toThrow();

  // t.is(error.status, 404); // TODO get status code from error
  expect(github.isDone()).toBe(true);
});
