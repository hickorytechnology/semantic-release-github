import { $log } from '@tsed/logger';
import { cleanAll } from 'nock';
import { BranchSpec, Context, GlobalConfig, NextRelease } from 'semantic-release';
import tempy from 'tempy';
import { stat } from 'fs-extra';
import path from 'path';
import { escape } from 'querystring';
import { publishGitHub } from '../../../src/lifecycles/publish';
import { PluginOptions } from '../../../src/types/plugin-options';
import { authenticate, upload } from '../../helpers/mock-github';
import { resolveConfig } from '../../../src/utils/resolve-config';

/* eslint camelcase: ["error", {properties: "never"}] */
const cwd = 'test/fixtures/files';

jest.mock('@tsed/logger');

afterEach(() => {
  // Clear nock
  cleanAll();
});

test('Publish a release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const branch = 'test_branch';
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` } as GlobalConfig;
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true } as BranchSpec,
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Publish a release on a channel', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', channel: 'next', main: false } as BranchSpec,
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: true,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Publish a prerelease', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'prerelease', channel: 'beta' },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: true,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Publish a maintenance release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: 'test_branch', type: 'maintenance', channel: '1.x', main: false },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl, id: releaseId });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test.skip('Publish a release, retrying 4 times', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig({}, context);

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      name: nextRelease.gitTag,
      body: nextRelease.notes,
      prerelease: false,
    })
    .times(3)
    .reply(404)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl, id: releaseId });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});

test('Publish a release with one asset', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const untaggedReleaseUrl = `https://github.com/${owner}/${repo}/releases/untagged-123`;
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const assetUrl = `https://github.com/${owner}/${repo}/releases/download/${nextRelease.version}/.dotfile`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };
  const pluginConfig = resolveConfig(
    {
      assets: [['**', '!**/*.txt'], { path: '.dotfile', label: 'A dotfile with no ext' }],
    },
    context
  );

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      draft: true,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: untaggedReleaseUrl, id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, { draft: false })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const githubUpload = upload(env, {
    uploadUrl: 'https://github.com',
    contentLength: (await stat(path.resolve(cwd, '.dotfile'))).size,
  })
    .post(`${uploadUri}?name=${escape('.dotfile')}&label=${escape('A dotfile with no ext')}`)
    .reply(200, { browser_download_url: assetUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect($log.info).toBeCalledWith('Published file %s', assetUrl);
  expect(github.isDone()).toBe(true);
  expect(githubUpload.isDone()).toBe(true);
});

test('Publish a release with one asset and custom github url', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_URL: 'https://othertesturl.com:443', GH_TOKEN: 'github_token', GH_PREFIX: 'prefix' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const untaggedReleaseUrl = `${env.GH_URL}/${owner}/${repo}/releases/untagged-123`;
  const releaseUrl = `${env.GH_URL}/${owner}/${repo}/releases/${nextRelease.version}`;
  const assetUrl = `${env.GH_URL}/${owner}/${repo}/releases/download/${nextRelease.version}/upload.txt`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `${env.GH_URL}${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      assets: [
        ['*.txt', '!**/*_other.txt'],
        { path: ['*.txt', '!**/*_other.txt'], label: 'A text file' },
        'upload.txt',
      ],
    },
    context
  );

  const github = authenticate(env, {})
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      draft: true,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: untaggedReleaseUrl, id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, { draft: false })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const githubUpload = upload(env, {
    uploadUrl: env.GH_URL,
    contentLength: (await stat(path.resolve(cwd, 'upload.txt'))).size,
  })
    .post(`${uploadUri}?name=${escape('upload.txt')}&label=${escape('A text file')}`)
    .reply(200, { browser_download_url: assetUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect($log.info).toBeCalledWith('Published file %s', assetUrl);
  expect(github.isDone()).toBe(true);
  expect(githubUpload.isDone()).toBe(true);
});

test('Publish a release with an array of missing assets', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const emptyDirectory = tempy.directory();
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const untaggedReleaseUrl = `https://github.com/${owner}/${repo}/releases/untagged-123`;
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      assets: [emptyDirectory, { path: 'missing.txt', name: 'missing.txt' }],
    },
    context
  );

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      draft: true,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: untaggedReleaseUrl, id: releaseId })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, { draft: false })
    .reply(200, { html_url: releaseUrl });

  const result = await publishGitHub(pluginConfig, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect($log.error).toBeCalledWith('The asset %s cannot be read, and will be ignored.', 'missing.txt');
  expect($log.error).toBeCalledWith('The asset %s is not a file, and will be ignored.', emptyDirectory);
  expect(github.isDone()).toBe(true);
});

test.skip('Throw error without retries for 400 error', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(404)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      name: nextRelease.gitTag,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(400);

  await expect(publishGitHub({} as PluginOptions, context)).rejects.toThrow();

  // t.is(error.status, 400);
  expect(github.isDone()).toBe(true);
});

test('Publish a release when env.GITHUB_URL is set to https://github.com (Default in GitHub Actions, #268)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {
    GITHUB_TOKEN: 'github_token',
    GITHUB_URL: 'https://github.com',
    GITHUB_API_URL: 'https://api.github.com',
  };
  const nextRelease = { gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const uploadUri = `/api/uploads/repos/${owner}/${repo}/releases/${releaseId}/assets`;
  const uploadUrl = `https://github.com${uploadUri}{?name,label}`;
  const branch = 'test_branch';

  const context: Context | any = {
    cwd,
    env,
    options,
    branch: { name: branch, type: 'release', main: true },
    nextRelease,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const github = authenticate(env)
    .post(`/repos/${owner}/${repo}/releases`, {
      tag_name: nextRelease.gitTag,
      target_commitish: branch,
      body: nextRelease.notes,
      prerelease: false,
    })
    .reply(200, { upload_url: uploadUrl, html_url: releaseUrl });

  const result = await publishGitHub({} as PluginOptions, context);

  expect(result.url).toBe(releaseUrl);
  expect($log.info).toBeCalledWith('Published GitHub release: %s', releaseUrl);
  expect(github.isDone()).toBe(true);
});
