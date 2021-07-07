import { RestEndpointMethodTypes } from '@octokit/rest';

export function getSearchQueries(
  base: string,
  commits: any[],
  separator = '+'
): RestEndpointMethodTypes['search']['issuesAndPullRequests']['parameters'][] {
  return commits.reduce((searches, commit) => {
    const updatedSearches = [...searches];
    const lastSearch = updatedSearches[updatedSearches.length - 1];

    if (lastSearch && lastSearch.length + commit.length <= 256 - separator.length) {
      updatedSearches[updatedSearches.length - 1] = `${lastSearch}${separator}${commit}`;
    } else {
      updatedSearches.push(`${base}${separator}${commit}`);
    }

    return updatedSearches;
  }, []);
}
