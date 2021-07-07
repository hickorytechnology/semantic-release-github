import { Octokit } from '@octokit/rest';
import { ISSUE_ID } from '../definitions/constants';

export async function findSRIssues(github: Octokit, title: string, owner: string, repo: string): Promise<any[]> {
  const {
    data: { items: issues },
  } = await github.search.issuesAndPullRequests({
    q: `in:title+repo:${owner}/${repo}+type:issue+state:open+${title}`,
  });

  return issues.filter((issue) => issue.body && issue.body.includes(ISSUE_ID));
}
