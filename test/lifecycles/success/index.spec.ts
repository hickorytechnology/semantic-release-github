import { $log } from '@tsed/logger';
import { cleanAll } from 'nock';
import { Context, LastRelease, NextRelease, Release } from 'semantic-release';
import { repeat } from 'lodash';
import { SuccessHandler } from '../../../src/lifecycles/success';
import { resolveConfig } from '../../../src/utils/resolve-config';
import { authenticate } from '../../helpers/mock-github';
import { getReleaseLinks } from '../../../src/lifecycles/success/get-release-links';
import { ISSUE_ID } from '../../../src/definitions/constants';

jest.mock('@tsed/logger');

afterEach(() => {
  // Clear nock
  cleanAll();
});

test('Add comment and labels to PRs associated with release commits and issues solved by PR/commits comments', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const redirectedOwner = 'test_user_2';
  const redirectedRepo = 'test_repo_2';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, body: 'Fixes #3', state: 'closed' },
  ];
  const options = {
    branch: 'master',
    repositoryUrl: `https://github.com/${owner}/${repo}.git`,
  };
  const commits = [
    { hash: '123', message: 'Commit 1 message\n\n Fix #1', tree: { long: 'aaa' } },
    { hash: '456', message: 'Commit 2 message', tree: { long: 'ccc' } },
    {
      hash: '789',
      message: `Commit 3 message Closes https://github.com/${redirectedOwner}/${redirectedRepo}/issues/4`,
      tree: { long: 'ccc' },
    },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${redirectedOwner}/${redirectedRepo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${redirectedOwner}/${redirectedRepo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${redirectedOwner}/${redirectedRepo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .get(`/repos/${redirectedOwner}/${redirectedRepo}/pulls/2/commits`)
    .reply(200, [{ sha: commits[1].hash }])

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/1/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/2/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-2' })

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/2/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/3/comments`, {
      body: /This issue has been resolved/,
    })
    .reply(200, { html_url: 'https://github.com/successcomment-3' })

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/3/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/4/comments`, {
      body: /This issue has been resolved/,
    })
    .reply(200, { html_url: 'https://github.com/successcomment-4' })

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues/4/labels`, '["released"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${redirectedOwner}/${redirectedRepo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 1);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 2, 'https://github.com/successcomment-2');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 2);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 3, 'https://github.com/successcomment-3');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 3);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 4, 'https://github.com/successcomment-4');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 4);
  expect(github.isDone()).toBe(true);
});

test('Add comment and labels to PRs associated with release commits and issues closed by PR/commits comments with custom URL', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_URL: 'https://custom-url.com', GH_TOKEN: 'github_token', GH_PREFIX: 'prefix' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, body: 'Fixes #3', state: 'closed' },
  ];
  const options = { branch: 'master', repositoryUrl: `https://custom-url.com/${owner}/${repo}.git` };
  const commits = [
    { hash: '123', message: 'Commit 1 message\n\n Fix #1' },
    { hash: '456', message: 'Commit 2 message' },
    { hash: '789', message: `Commit 3 message Closes https://custom-url.com/${owner}/${repo}/issues/4` },
  ];
  const nextRelease = { version: '1.0.0', channel: 'next' } as NextRelease | any;
  const releases = [{ name: 'GitHub release', url: 'https://custom-url.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .get(`/repos/${owner}/${repo}/pulls/2/commits`)
    .reply(200, [{ sha: commits[1].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://custom-url.com/successcomment-1' })

    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["released on @next"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/2/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://custom-url.com/successcomment-2' })

    .post(`/repos/${owner}/${repo}/issues/2/labels`, '["released on @next"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/3/comments`, { body: /This issue has been resolved/ })
    .reply(200, { html_url: 'https://custom-url.com/successcomment-3' })

    .post(`/repos/${owner}/${repo}/issues/3/labels`, '["released on @next"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/4/comments`, { body: /This issue has been resolved/ })
    .reply(200, { html_url: 'https://custom-url.com/successcomment-4' })

    .post(`/repos/${owner}/${repo}/issues/4/labels`, '["released on @next"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://custom-url.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released on @next'], 1);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 2, 'https://custom-url.com/successcomment-2');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released on @next'], 2);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 3, 'https://custom-url.com/successcomment-3');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released on @next'], 3);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 4, 'https://custom-url.com/successcomment-4');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released on @next'], 4);
  expect(github.isDone()).toBe(true);
});

test('Make multiple search queries if necessary', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, state: 'closed' },
    { number: 3, pull_request: {}, state: 'closed' },
    { number: 4, pull_request: {}, state: 'closed' },
    { number: 5, pull_request: {}, state: 'closed' },
    { number: 6, pull_request: {}, state: 'closed' },
  ];
  const options = { branch: 'master', repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [
    { hash: repeat('a', 40), message: 'Commit 1 message' },
    { hash: repeat('b', 40), message: 'Commit 2 message' },
    { hash: repeat('c', 40), message: 'Commit 3 message' },
    { hash: repeat('d', 40), message: 'Commit 4 message' },
    { hash: repeat('e', 40), message: 'Commit 5 message' },
    { hash: repeat('f', 40), message: 'Commit 6 message' },
    { hash: repeat('g', 40), message: 'Commit 7 message' },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits[0].hash}+${commits[1].hash}+${commits[2].hash}+${
        commits[3].hash
      }+${commits[4].hash}`
    )
    .reply(200, { items: [prs[0], prs[1], prs[2], prs[3], prs[4]] })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits[5].hash}+${commits[6].hash}`
    )
    .reply(200, { items: [prs[5], prs[1]] })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .get(`/repos/${owner}/${repo}/pulls/2/commits`)
    .reply(200, [{ sha: commits[1].hash }])

    .get(`/repos/${owner}/${repo}/pulls/3/commits`)
    .reply(200, [{ sha: commits[2].hash }])

    .get(`/repos/${owner}/${repo}/pulls/4/commits`)
    .reply(200, [{ sha: commits[3].hash }])

    .get(`/repos/${owner}/${repo}/pulls/5/commits`)
    .reply(200, [{ sha: commits[4].hash }])

    .get(`/repos/${owner}/${repo}/pulls/6/commits`)
    .reply(200, [{ sha: commits[5].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/2/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-2' })

    .post(`/repos/${owner}/${repo}/issues/2/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/3/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-3' })

    .post(`/repos/${owner}/${repo}/issues/3/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/4/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-4' })

    .post(`/repos/${owner}/${repo}/issues/4/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/5/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-5' })

    .post(`/repos/${owner}/${repo}/issues/5/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/6/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-6' })

    .post(`/repos/${owner}/${repo}/issues/6/labels`, '["released"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 1);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 2, 'https://github.com/successcomment-2');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 2);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 3, 'https://github.com/successcomment-3');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 3);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 4, 'https://github.com/successcomment-4');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 4);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 5, 'https://github.com/successcomment-5');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 5);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 6, 'https://github.com/successcomment-6');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 6);
  expect(github.isDone()).toBe(true);
});

test('Do not add comment and labels for unrelated PR returned by search (compare sha and merge_commit_sha)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, state: 'closed' },
  ];
  const options = { branch: 'master', repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [
    { hash: '123', message: 'Commit 1 message' },
    { hash: '456', message: 'Commit 2 message' },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: 'rebased_sha' }])

    .get(`/repos/${owner}/${repo}/pulls/1`)
    .reply(200, { merge_commit_sha: commits[0].hash })

    .get(`/repos/${owner}/${repo}/pulls/2/commits`)
    .reply(200, [{ sha: 'rebased_sha' }])

    .get(`/repos/${owner}/${repo}/pulls/2`)
    .reply(200, { merge_commit_sha: 'unrelated_sha' })

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["released"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 1);
  expect(github.isDone()).toBe(true);
});

test('Do not add comment and labels if no PR is associated with release commits', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const options = { branch: 'master', repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: [] })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect(github.isDone()).toBe(true);
});

test('Do not add comment and labels to PR/issues from other repo', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const options = { branch: 'master', repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [
    { hash: '123', message: 'Commit 1 message\n\n Fix other/other#1' },
    { hash: '456', message: `Commit 2 message Fix ${owner}/${repo}#2` },
    { hash: '789', message: 'Commit 3 message Closes other/other#3' },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: [] })

    .post(`/repos/${owner}/${repo}/issues/2/comments`, { body: /This issue has been resolved/ })
    .reply(200, { html_url: 'https://github.com/successcomment-2' })

    .post(`/repos/${owner}/${repo}/issues/2/labels`, '["released"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 2, 'https://github.com/successcomment-2');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 2);
  expect(github.isDone()).toBe(true);
});

test('Ignore missing and forbidden issues/PRs', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, body: 'Fixes #4', state: 'closed' },
    { number: 3, pull_request: {}, body: 'Fixes #5', state: 'closed' },
  ];
  const options = { branch: 'master', repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [
    { hash: '123', message: 'Commit 1 message\n\n Fix #1' },
    { hash: '456', message: 'Commit 2 message' },
    { hash: '789', message: 'Commit 3 message' },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: { enabled: true, comment: '' },
      failComment: { enabled: true, failTitle },
      releasedLabels: { enabled: true },
    },
    context
  );

  const github = authenticate(env)
    .persist()
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .get(`/repos/${owner}/${repo}/pulls/2/commits`)
    .reply(200, [{ sha: commits[1].hash }])

    .get(`/repos/${owner}/${repo}/pulls/3/commits`)
    .reply(200, [{ sha: commits[2].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/2/comments`, { body: /This PR is included/ })
    .reply(404)

    .post(`/repos/${owner}/${repo}/issues/3/comments`, { body: /This PR is included/ })
    .reply(403)

    .post(`/repos/${owner}/${repo}/issues/4/comments`, { body: /This issue has been resolved/ })
    .reply(200, { html_url: 'https://github.com/successcomment-4' })

    .post(`/repos/${owner}/${repo}/issues/4/labels`, '["released"]')
    .reply(200, {})

    .post(`/repos/${owner}/${repo}/issues/5/comments`, { body: /This issue has been resolved/ })
    .reply(200, { html_url: 'https://github.com/successcomment-5' })

    .post(`/repos/${owner}/${repo}/issues/5/labels`, '["released"]')
    .reply(200, {})

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 1);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 4, 'https://github.com/successcomment-4');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 4);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 5, 'https://github.com/successcomment-5');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released'], 5);
  expect($log.error).toBeCalledWith("Failed to add a comment to the issue #%d as it doesn't exist.", 2);
  expect($log.error).toBeCalledWith('Not allowed to add a comment to the issue #%d.', 3);
  expect(github.isDone()).toBe(true);
});

test('Add custom comment and labels', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, prop: 'PR prop', pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '2.0.0', channel: 'next' } as NextRelease | any;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment:
          // eslint-disable-next-line max-len
          'last release: ${lastRelease.version} nextRelease: ${nextRelease.version} branch: ${branch.name} commits: ${commits.length} releases: ${releases.length} PR attribute: ${issue.prop}',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: true,
        labels: ['released on @<%= nextRelease.channel %>', 'released from <%= branch.name %>'],
      },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })
    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])
    .post(`/repos/${owner}/${repo}/issues/1/comments`, {
      body: /last release: 1\.0\.0 nextRelease: 2\.0\.0 branch: master commits: 1 releases: 1 PR attribute: PR prop/,
    })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })
    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["released on @next","released from master"]')
    .reply(200, {})
    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['released on @next', 'released from master'], 1);
  expect(github.isDone()).toBe(true);
});

test('Add custom label', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '2.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: true,
        labels: ['custom label'],
      },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })
    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])
    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })
    .post(`/repos/${owner}/${repo}/issues/1/labels`, '["custom label"]')
    .reply(200, {})
    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect($log.info).toBeCalledWith('Added labels %O to issue #%d', ['custom label'], 1);
  expect(github.isDone()).toBe(true);
});

test('Comment on issue/PR without ading a label', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '2.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })
    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])
    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })
    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release to include all release links at the bottom', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const releases = [
    { name: 'GitHub release', url: 'https://github.com/release', id: releaseId },
    { name: 'S3', url: 's3://my-bucket/release-asset' },
    { name: 'Docker: docker.io/python:slim' },
  ] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'bottom',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })
    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])
    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })
    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] })
    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      body: nextRelease.notes.concat('\n---\n', getReleaseLinks(releases)),
    })
    .reply(200, { html_url: releaseUrl });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release to include all release links at the top', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releaseUrl = `https://github.com/${owner}/${repo}/releases/${nextRelease.version}`;
  const releaseId = 1;
  const releases = [
    { name: 'GitHub release', url: 'https://github.com/release', id: releaseId },
    { name: 'S3', url: 's3://my-bucket/release-asset' },
    { name: 'Docker: docker.io/python:slim' },
  ] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'top',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] })

    .patch(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      body: getReleaseLinks(releases).concat('\n---\n', nextRelease.notes),
    })
    .reply(200, { html_url: releaseUrl });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release to include all release links with no additional releases (top)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'top',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release to include all release links with no additional releases (bottom)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'bottom',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release to include all release links with no releases', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releases = [] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'bottom',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Editing the release with no ID in the release', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const prs = [{ number: 1, pull_request: {}, state: 'closed' }];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const nextRelease = { version: '2.0.0', gitTag: 'v1.0.0', notes: 'Test release note body' } as NextRelease;
  const lastRelease = { version: '1.0.0' } as LastRelease;
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const releases = [
    { name: 'GitHub release', url: 'https://github.com/release' },
    { name: 'S3', url: 's3://my-bucket/release-asset' },
    { name: 'Docker: docker.io/python:slim' },
  ] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    lastRelease,
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
      releasedLabels: {
        enabled: false,
      },
      addReleases: 'bottom',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-1' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 1, 'https://github.com/successcomment-1');
  expect(github.isDone()).toBe(true);
});

test('Ignore errors when adding comments and closing issues', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const issues = [
    { number: 1, body: 'Issue 1 body', title: failTitle },
    { number: 2, body: `Issue 2 body\n\n${ISSUE_ID}`, title: failTitle },
    { number: 3, body: `Issue 3 body\n\n${ISSUE_ID}`, title: failTitle },
  ];
  const prs = [
    { number: 1, pull_request: {}, state: 'closed' },
    { number: 2, pull_request: {}, state: 'closed' },
  ];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [
    { hash: '123', message: 'Commit 1 message' },
    { hash: '456', message: 'Commit 2 message' },
  ];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: prs })

    .get(`/repos/${owner}/${repo}/pulls/1/commits`)
    .reply(200, [{ sha: commits[0].hash }])

    .get(`/repos/${owner}/${repo}/pulls/2/commits`)
    .reply(200, [{ sha: commits[1].hash }])

    .post(`/repos/${owner}/${repo}/issues/1/comments`, { body: /This PR is included/ })
    .reply(400, {})

    .post(`/repos/${owner}/${repo}/issues/2/comments`, { body: /This PR is included/ })
    .reply(200, { html_url: 'https://github.com/successcomment-2' })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: issues })

    .patch(`/repos/${owner}/${repo}/issues/2`, { state: 'closed' })
    .times(4)
    .reply(500)

    .patch(`/repos/${owner}/${repo}/issues/3`, { state: 'closed' })
    .reply(200, { html_url: 'https://github.com/issues/3' });

  await expect(new SuccessHandler().handle(pluginConfig, context)).rejects.toThrow();

  // t.is(error1.status, 400);
  // t.is(error2.status, 500);

  expect($log.error).toBeCalledWith('Failed to add a comment to the issue #%d.', 1);
  expect($log.error).toBeCalledWith('Failed to close the issue #%d.', 2);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s', 2, 'https://github.com/successcomment-2');
  expect($log.info).toBeCalledWith('Closed issue #%d: %s.', 3, 'https://github.com/issues/3');
  expect(github.isDone()).toBe(true);
});

test('Close open issues when a release is successful', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const issues = [
    { number: 1, body: 'Issue 1 body', title: failTitle },
    { number: 2, body: `Issue 2 body\n\n${ISSUE_ID}`, title: failTitle },
    { number: 3, body: `Issue 3 body\n\n${ISSUE_ID}`, title: failTitle },
  ];
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: true, failTitle },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: [] })

    .get(
      `/search/issues?q=${encodeURIComponent('in:title')}+${encodeURIComponent(
        `repo:${owner}/${repo}`
      )}+${encodeURIComponent('type:issue')}+${encodeURIComponent('state:open')}+${encodeURIComponent(failTitle)}`
    )
    .reply(200, { items: issues })

    .patch(`/repos/${owner}/${repo}/issues/2`, { state: 'closed' })
    .reply(200, { html_url: 'https://github.com/issues/2' })

    .patch(`/repos/${owner}/${repo}/issues/3`, { state: 'closed' })
    .reply(200, { html_url: 'https://github.com/issues/3' });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Closed issue #%d: %s.', 2, 'https://github.com/issues/2');
  expect($log.info).toBeCalledWith('Closed issue #%d: %s.', 3, 'https://github.com/issues/3');
  expect(github.isDone()).toBe(true);
});

test('Skip commenting on issues/PR if "successComment.enabled" is "false"', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [{ hash: '123', message: 'Commit 1 message\n\n Fix #1', tree: { long: 'aaa' } }];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: false,
      },
    },
    context
  );

  authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Skip commenting on issues and pull requests.');
});

test('Skip closing issues if "failComment.enabled" is "false"', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const commits = [{ hash: '123', message: 'Commit 1 message' }];
  const nextRelease = { version: '1.0.0' } as NextRelease;
  const releases = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];

  const context: Context | any = {
    env,
    options,
    branch: { name: 'master' },
    commits,
    nextRelease,
    releases,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginConfig = resolveConfig(
    {
      successComment: {
        enabled: true,
        comment: '',
      },
      failComment: { enabled: false },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo}`)}+${encodeURIComponent(
        'type:pr'
      )}+${encodeURIComponent('is:merged')}+${commits.map((commit) => commit.hash).join('+')}`
    )
    .reply(200, { items: [] });

  await new SuccessHandler().handle(pluginConfig, context);

  expect($log.info).toBeCalledWith('Skip closing issue.');
  expect(github.isDone()).toBe(true);
});
