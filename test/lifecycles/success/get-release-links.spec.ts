import { Release } from 'semantic-release';
import { RELEASE_NAME } from '../../../src/definitions/constants';
import { getReleaseLinks } from '../../../src/lifecycles/success/get-release-links';

test('Comment for release with multiple releases', () => {
  const releaseInfos = [
    { name: RELEASE_NAME, url: 'https://github.com/release' },
    { name: 'Http release', url: 'https://release.com/release' },
    { name: 'npm release', url: 'https://npm.com/release' },
  ] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe(
    `This release is also available on:
- [Http release](https://release.com/release)
- [npm release](https://npm.com/release)`
  );
});

test('Release with missing release URL', () => {
  const releaseInfos = [
    { name: RELEASE_NAME, url: 'https://github.com/release' },
    { name: 'Http release', url: 'https://release.com/release' },
    { name: 'npm release' },
  ] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe(
    `This release is also available on:
- [Http release](https://release.com/release)
- \`npm release\``
  );
});

test('Release with one release', () => {
  const releaseInfos = [
    { name: RELEASE_NAME, url: 'https://github.com/release' },
    { name: 'Http release', url: 'https://release.com/release' },
  ] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe(
    `This release is also available on:
- [Http release](https://release.com/release)`
  );
});

test('Release with non http releases', () => {
  const releaseInfos = [{ name: 'S3', url: 's3://my-bucket/release-asset' }] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe(
    `This release is also available on:
- S3: \`s3://my-bucket/release-asset\``
  );
});

test('Release with only github release', () => {
  const releaseInfos = [{ name: RELEASE_NAME, url: 'https://github.com/release' }] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe('');
});

test('Comment with no release object', () => {
  const releaseInfos = [] as Release[];
  const comment = getReleaseLinks(releaseInfos);

  expect(comment).toBe('');
});
