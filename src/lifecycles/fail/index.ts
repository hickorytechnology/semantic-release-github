import { $log } from '@tsed/logger';
import { template } from 'lodash';
import { Context } from 'semantic-release';
import { ISSUE_ID } from '../../definitions/constants';
import { PluginOptions } from '../../types/plugin-options';
import { findSRIssues } from '../../utils/find-sr-issues';
import { getClient } from '../../utils/get-client';
import { parseGitHubUrl } from '../../utils/parse-github-url';
import { resolveConfig } from '../../utils/resolve-config';
import { getFailComment } from './get-fail-comment';

export async function failGitHub(pluginOptions: PluginOptions, context: Context | any): Promise<any> {
  const {
    options: { repositoryUrl },
    branch,
    errors,
  } = context;
  const { githubToken, githubUrl, githubApiPathPrefix, proxy, failComment, failLabels, assignees } =
    resolveConfig(pluginOptions, context);

  if (!failComment.enabled) {
    $log.info('Skip issue creation.');
    return;
  }

  try {
    const github = getClient(githubToken, githubUrl, githubApiPathPrefix, proxy);
    // In case the repo changed name, get the new `repo`/`owner` as the search API will not follow redirects
    const parsedUrl = parseGitHubUrl(repositoryUrl);
    if (parsedUrl.owner === undefined || parsedUrl.repo === undefined) {
      return;
    }

    const retrievedRepo = await github.repos.get({ owner: parsedUrl.owner, repo: parsedUrl.repo });
    if (retrievedRepo == null) {
      $log.error(`Could not find repository with owner "${parsedUrl.owner}" and repo "${parsedUrl.repo}"`);
      return;
    }

    const [owner, repo] = retrievedRepo.data.full_name.split('/');

    const body =
      failComment.comment !== undefined && failComment.comment !== ''
        ? template(failComment.comment)({ branch, errors })
        : getFailComment(branch, errors);
    const [srIssue] = await findSRIssues(github, failComment.failTitle, owner, repo);

    if (srIssue) {
      $log.info('Found existing semantic-release issue #%d.', srIssue.number);
      const comment = { owner, repo, issue_number: srIssue.number, body };
      $log.debug('create comment: %O', comment);
      const {
        data: { html_url: url },
      } = await github.issues.createComment(comment);
      $log.info('Added comment to issue #%d: %s.', srIssue.number, url);
    } else {
      const newIssue = {
        owner,
        repo,
        title: failComment.failTitle,
        body: `${body}\n\n${ISSUE_ID}`,
        labels: failLabels.enabled ? failLabels.labels : [],
        assignees: assignees.length > 0 ? assignees : undefined,
      };
      $log.debug('create issue: %O', newIssue);
      const {
        data: { html_url: url, number },
      } = await github.issues.create(newIssue);
      $log.info('Created issue #%d: %s.', number, url);
    }
  } catch (error) {
    $log.error(error);
  }
}
