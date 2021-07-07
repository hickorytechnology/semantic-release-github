/* eslint-disable indent */
import { Release } from 'semantic-release';
import { RELEASE_NAME } from '../../definitions/constants';

const linkify = (releaseInfo: Release): string => {
  if (releaseInfo.url) {
    return releaseInfo.url.startsWith('http')
      ? `[${releaseInfo.name}](${releaseInfo.url})`
      : `${releaseInfo.name}: \`${releaseInfo.url}\``;
  }

  return `\`${releaseInfo.name}\``;
};

const filterReleases = (releaseInfos: Release[]) =>
  releaseInfos.filter((releaseInfo) => releaseInfo.name && releaseInfo.name !== RELEASE_NAME);

export function getReleaseLinks(releaseInfos: Release[]): string {
  return `${
    filterReleases(releaseInfos).length > 0
      ? `This release is also available on:\n${filterReleases(releaseInfos)
          .map((releaseInfo) => `- ${linkify(releaseInfo)}`)
          .join('\n')}`
      : ''
  }`;
}
