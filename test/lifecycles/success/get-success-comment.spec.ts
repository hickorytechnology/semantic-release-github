import { Release } from 'semantic-release';
import { getSuccessComment } from '../../../src/lifecycles/success/get-success-comment';

const HOME_URL = 'https://github.com/semantic-release/semantic-release';

test('Comment for issue with multiple releases', () => {
  const issue = { number: 1 };
  const releaseInfos = [
    { name: 'GitHub release', url: 'https://github.com/release' },
    { name: 'npm release', url: 'https://npm.com/release' },
  ] as Release[];
  const nextRelease = { version: '1.0.0' };
  const comment = getSuccessComment(issue, releaseInfos, nextRelease);

  expect(comment).toBe(
    `:tada: This issue has been resolved in version 1.0.0 :tada:

The release is available on:
- [GitHub release](https://github.com/release)
- [npm release](https://npm.com/release)

Your **[semantic-release](${HOME_URL})** bot :package::rocket:`
  );
});

test('Comment for PR with multiple releases', () => {
  const issue: any = { number: 1, pull_request: {} };
  const releaseInfos = [
    { name: 'GitHub release', url: 'https://github.com/release' },
    { name: 'npm release', url: 'https://npm.com/release' },
  ] as Release[];
  const nextRelease = { version: '1.0.0' };
  const comment = getSuccessComment(issue, releaseInfos, nextRelease);

  expect(comment).toBe(
    `:tada: This PR is included in version 1.0.0 :tada:

The release is available on:
- [GitHub release](https://github.com/release)
- [npm release](https://npm.com/release)

Your **[semantic-release](${HOME_URL})** bot :package::rocket:`
  );
});

test('Comment with missing release URL', () => {
  const issue: any = { number: 1 };
  const releaseInfos = [
    { name: 'GitHub release', url: 'https://github.com/release' },
    { name: 'npm release' },
  ] as Release[];
  const nextRelease = { version: '1.0.0' };
  const comment = getSuccessComment(issue, releaseInfos, nextRelease);

  expect(comment).toBe(
    `:tada: This issue has been resolved in version 1.0.0 :tada:

The release is available on:
- [GitHub release](https://github.com/release)
- \`npm release\`

Your **[semantic-release](${HOME_URL})** bot :package::rocket:`
  );
});

test('Comment with one release', () => {
  const issue: any = { number: 1 };
  const releaseInfos = [{ name: 'GitHub release', url: 'https://github.com/release' }] as Release[];
  const nextRelease = { version: '1.0.0' };
  const comment = getSuccessComment(issue, releaseInfos, nextRelease);

  expect(comment).toBe(
    `:tada: This issue has been resolved in version 1.0.0 :tada:

The release is available on [GitHub release](https://github.com/release)

Your **[semantic-release](${HOME_URL})** bot :package::rocket:`
  );
});

test('Comment with no release object', () => {
  const issue: any = { number: 1 };
  const releaseInfos = [] as Release[];
  const nextRelease = { version: '1.0.0' };
  const comment = getSuccessComment(issue, releaseInfos, nextRelease);

  expect(comment).toBe(
    `:tada: This issue has been resolved in version 1.0.0 :tada:

Your **[semantic-release](${HOME_URL})** bot :package::rocket:`
  );
});
