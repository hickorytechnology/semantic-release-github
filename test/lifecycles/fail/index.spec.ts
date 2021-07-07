/* eslint-disable no-param-reassign */
import SemanticReleaseError from '@semantic-release/error';
import { $log } from '@tsed/logger';
import { cleanAll } from 'nock';
import { escape } from 'querystring';
import { ISSUE_ID } from '../../../src/definitions/constants';
import { failGitHub } from '../../../src/lifecycles/fail';
import { PluginOptions } from '../../../src/types/plugin-options';
import { authenticate } from '../../helpers/mock-github';
import * as rateLimit from '../../helpers/rate-limit';

// jest.mock('../../../src/definitions/rate-limit', () => rateLimit);
jest.mock('@tsed/logger');

afterEach(() => {
  // Clear nock
  cleanAll();
  // restore();
});

test('Open a new issue with the list of errors', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const redirectedOwner = 'test_user_2';
  const redirectedRepo = 'test_repo_2';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const pluginConfig = { failComment: { enabled: true, failTitle } } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
    new SemanticReleaseError('Error message 3', 'ERR3', 'Error 3 details'),
  ];

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${redirectedOwner}/${redirectedRepo}` })

    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${redirectedOwner}/${redirectedRepo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: [] })

    .post(`/repos/${redirectedOwner}/${redirectedRepo}/issues`, {
      title: failTitle,
      // eslint-disable-next-line max-len
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---\n\n### Error message 3\n\nError 3 details\n\n---/,
      labels: ['semantic-release'],
    })
    .reply(200, { html_url: 'https://github.com/issues/1', number: 1 });

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Created issue #%d: %s.', 1, 'https://github.com/issues/1');
  expect(github.isDone()).toBe(true);
});

test.skip('Open a new issue with the list of errors, retrying 4 times', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const pluginConfig = { failComment: { enabled: true, failTitle } } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
    new SemanticReleaseError('Error message 3', 'ERR3', 'Error 3 details'),
  ];
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })

    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .times(3)
    .reply(404)

    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: [] })

    .post(`/repos/${owner}/${repo}/issues`, {
      title: failTitle,
      // eslint-disable-next-line max-len
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---\n\n### Error message 3\n\nError 3 details\n\n---/,
      labels: ['semantic-release'],
    })
    .times(3)
    .reply(500)
    .post(`/repos/${owner}/${repo}/issues`, {
      title: failTitle,
      // eslint-disable-next-line max-len
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---\n\n### Error message 3\n\nError 3 details\n\n---/,
      labels: ['semantic-release'],
    })
    .reply(200, { html_url: 'https://github.com/issues/1', number: 1 });

  await failGitHub(pluginConfig, {
    env,
    options,
    branch: { name: 'master' },
    errors,
    logger: jest.fn(),
  });

  expect($log.info).toBeCalledWith('Created issue #%d: %s.', 1, 'https://github.com/issues/1');
  expect(github.isDone()).toBe(true);
});

test('Open a new issue with the list of errors and custom title and comment', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'Custom title';
  const comment = 'branch ${branch.name} ${errors[0].message} ${errors[1].message} ${errors[2].message}';
  const pluginConfig = { failComment: { enabled: true, comment, failTitle } } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
    new SemanticReleaseError('Error message 3', 'ERR3', 'Error 3 details'),
  ];
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: [] })
    .post(`/repos/${owner}/${repo}/issues`, {
      title: failTitle,
      body: `branch master Error message 1 Error message 2 Error message 3\n\n${ISSUE_ID}`,
      labels: ['semantic-release'],
    })
    .reply(200, { html_url: 'https://github.com/issues/1', number: 1 });

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Created issue #%d: %s.', 1, 'https://github.com/issues/1');
  expect(github.isDone()).toBe(true);
});

test('Open a new issue with assignees and the list of errors', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const assignees = ['user1', 'user2'];
  const pluginConfig = { failComment: { enabled: true, failTitle }, assignees } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
  ];
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: [] })
    .post(`/repos/${owner}/${repo}/issues`, {
      title: failTitle,
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---/,
      labels: ['semantic-release'],
      assignees: ['user1', 'user2'],
    })
    .reply(200, { html_url: 'https://github.com/issues/1', number: 1 });

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Created issue #%d: %s.', 1, 'https://github.com/issues/1');
  expect(github.isDone()).toBe(true);
});

test('Open a new issue without labels and the list of errors', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const pluginConfig = {
    failComment: { enabled: true, failTitle },
    failLabels: { enabled: false },
  } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
  ];
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: [] })
    .post(`/repos/${owner}/${repo}/issues`, {
      title: failTitle,
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---/,
      labels: [],
    })
    .reply(200, { html_url: 'https://github.com/issues/1', number: 1 });

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Created issue #%d: %s.', 1, 'https://github.com/issues/1');
  expect(github.isDone()).toBe(true);
});

test('Update the first existing issue with the list of errors', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const failTitle = 'The automated release is failing 🚨';
  const pluginConfig = { failComment: { enabled: true, failTitle } } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
    new SemanticReleaseError('Error message 3', 'ERR3', 'Error 3 details'),
  ];
  const issues = [
    { number: 1, body: 'Issue 1 body', title: failTitle },
    { number: 2, body: `Issue 2 body\n\n${ISSUE_ID}`, title: failTitle },
    { number: 3, body: `Issue 3 body\n\n${ISSUE_ID}`, title: failTitle },
  ];
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { full_name: `${owner}/${repo}` })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(failTitle)}`
    )
    .reply(200, { items: issues })
    .post(`/repos/${owner}/${repo}/issues/2/comments`, {
      // eslint-disable-next-line max-len
      body: /---\n\n### Error message 1\n\nError 1 details\n\n---\n\n### Error message 2\n\nError 2 details\n\n---\n\n### Error message 3\n\nError 3 details\n\n---/,
    })
    .reply(200, { html_url: 'https://github.com/issues/2', number: 2 });

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Found existing semantic-release issue #%d.', 2);
  expect($log.info).toBeCalledWith('Added comment to issue #%d: %s.', 2, 'https://github.com/issues/2');
  expect(github.isDone()).toBe(true);
});

test('Skip if "failComment" is not enabled', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'github_token' };
  const pluginConfig = { failComment: { enabled: false } } as PluginOptions;
  const options = { repositoryUrl: `https://github.com/${owner}/${repo}.git` };
  const errors = [
    new SemanticReleaseError('Error message 1', 'ERR1', 'Error 1 details'),
    new SemanticReleaseError('Error message 2', 'ERR2', 'Error 2 details'),
    new SemanticReleaseError('Error message 3', 'ERR3', 'Error 3 details'),
  ];

  await failGitHub(pluginConfig, { env, options, branch: { name: 'master' }, errors, logger: jest.fn() });

  expect($log.info).toBeCalledWith('Skip issue creation.');
});
