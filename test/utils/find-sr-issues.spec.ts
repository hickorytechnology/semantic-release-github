/* eslint-disable no-param-reassign */
import { cleanAll } from 'nock';
import { escape } from 'querystring';
import { ISSUE_ID } from '../../src/definitions/constants';
import { findSRIssues } from '../../src/utils/find-sr-issues';
import { getClient } from '../../src/utils/get-client';
import { authenticate } from '../helpers/mock-github';
import * as rateLimit from '../helpers/rate-limit';

// jest.mock('../../src/definitions/rate-limit', () => rateLimit);
jest.mock('@tsed/logger');

const githubToken = 'github_token';
const client = getClient(githubToken, '', '', { enabled: false, options: {} });

afterEach(() => {
  // Clear nock
  cleanAll();
  // restore();
});

test('Filter out issues without ID', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const title = 'The automated release is failing 🚨';
  const issues = [
    { number: 1, body: 'Issue 1 body', title },
    { number: 2, body: `Issue 2 body\n\n${ISSUE_ID}`, title },
    { number: 3, body: `Issue 3 body\n\n${ISSUE_ID}`, title },
  ];
  const github = authenticate({}, { githubToken })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(title)}`
    )
    .reply(200, { items: issues });

  const srIssues = await findSRIssues(client, title, owner, repo);

  expect(srIssues).toStrictEqual([
    { number: 2, body: 'Issue 2 body\n\n<!-- semantic-release:github -->', title },
    { number: 3, body: 'Issue 3 body\n\n<!-- semantic-release:github -->', title },
  ]);
  expect(github.isDone()).toBe(true);
});

test('Return empty array if not issues found', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const title = 'The automated release is failing 🚨';
  const issues: any[] = [];
  const github = authenticate({}, { githubToken })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(title)}`
    )
    .reply(200, { items: issues });

  const srIssues = await findSRIssues(client, title, owner, repo);

  expect(srIssues).toStrictEqual([]);
  expect(github.isDone()).toBe(true);
});

test('Return empty array if not issues has matching ID', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const title = 'The automated release is failing 🚨';
  const issues = [
    { number: 1, body: 'Issue 1 body', title },
    { number: 2, body: 'Issue 2 body', title },
  ];
  const github = authenticate({}, { githubToken })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(title)}`
    )
    .reply(200, { items: issues });

  const srIssues = await findSRIssues(client, title, owner, repo);

  expect(srIssues).toStrictEqual([]);
  expect(github.isDone()).toBe(true);
});

test.skip('Retries 4 times', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const title = 'The automated release is failing :rotating_light:';
  const github = authenticate({}, { githubToken })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(title)}`
    )
    .times(4)
    .reply(422);

  // const error = await t.throwsAsync(findSRIssues(client, title, owner, repo));

  // t.is(error.status, 422);
  // t.true(github.isDone());
});

test.skip('Do not retry on 401 error', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const title = 'The automated release is failing :rotating_light:';
  const github = authenticate({}, { githubToken })
    .get(
      `/search/issues?q=${escape('in:title')}+${escape(`repo:${owner}/${repo}`)}+${escape(
        'type:issue'
      )}+${escape('state:open')}+${escape(title)}`
    )
    .reply(401);

  // const error = await t.throwsAsync(findSRIssues(client, title, owner, repo));

  // t.is(error.status, 401);
  // t.true(github.isDone());
});
