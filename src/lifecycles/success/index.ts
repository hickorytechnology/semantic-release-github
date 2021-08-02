import { components } from '@octokit/openapi-types';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import AggregateError from 'aggregate-error';
import { $log } from '@tsed/logger';
import issueParser from 'issue-parser';
import { flatten, isEmpty, template, uniqBy } from 'lodash';
import pFilter from 'p-filter';
import { Commit, Context, NextRelease, Release } from 'semantic-release';
import { RELEASE_NAME } from '../../definitions/constants';
import { PluginOptions } from '../../types/plugin-options';
import { findSRIssues } from '../../utils/find-sr-issues';
import { getClient } from '../../utils/get-client';
import { parseGitHubUrl } from '../../utils/parse-github-url';
import { resolveConfig } from '../../utils/resolve-config';
import { getReleaseLinks } from './get-release-links';
import { getSearchQueries } from './get-search-queries';
import { getSuccessComment } from './get-success-comment';
import { LifecycleHandler } from '../lifecycle-handler';

interface SuccessContext {
  options: { repositoryUrl: string };
  commits: Commit[];
  nextRelease: NextRelease;
  releases: Release[] | any[]; // any here because of missing "id" prop definition
  logger: {
    log: (message: string, ...vars: any[]) => void;
    error: (message: string, ...vars: any[]) => void;
  };
}

export class SuccessHandler implements LifecycleHandler<Context | any, any> {
  private context!: Context | any;

  private resolvedOptions!: PluginOptions;

  /**
   * List of the errors that may occur when executing the success lifecycle method.
   */
  private errors: any[] = [];

  public async handle(pluginOptions: PluginOptions, context: Context | any): Promise<any> {
    this.context = context;
    this.resolvedOptions = resolveConfig(pluginOptions, context);
    const {
      options: { repositoryUrl },
      commits,
      nextRelease,
      releases,
    }: SuccessContext = context;

    const { githubToken, githubUrl, githubApiPathPrefix, proxy, failComment, addReleases } = this.resolvedOptions;
    const github = getClient(githubToken, githubUrl, githubApiPathPrefix, proxy);

    // In case the repo changed name, get the new `repo`/`owner` as the search API will not follow redirects
    const parsedUrl = parseGitHubUrl(repositoryUrl);
    if (parsedUrl.owner === undefined || parsedUrl.repo === undefined) {
      return;
    }

    const [owner, repo] = (
      await github.repos.get({
        owner: parsedUrl.owner,
        repo: parsedUrl.repo,
      })
    ).data.full_name.split('/');

    await this.addSuccessCommentsAndReleaseLabels(github, owner, repo, releases, commits);

    if (failComment.enabled === false) {
      $log.info('Skip closing issue.');
    } else {
      await this.closeFailedReleaseIssues(github, owner, repo);
    }

    if (addReleases !== false && this.errors.length === 0) {
      await this.addReleases(github, owner, repo, addReleases, releases, nextRelease);
    }

    if (this.errors.length > 0) {
      throw new AggregateError(this.errors);
    }
  }

  private async addSuccessCommentsAndReleaseLabels(
    github: Octokit,
    owner: string,
    repo: string,
    releases: Release[],
    commits: Commit[]
  ): Promise<void> {
    const { githubUrl, successComment, releasedLabels } = this.resolvedOptions;

    if (!successComment.enabled && !releasedLabels.enabled) {
      $log.info('Skip commenting and release labels on issues and pull requests.');
      return;
    }

    const parser = issueParser('github', githubUrl ? { hosts: [githubUrl] } : {});
    const releaseInfos = releases.filter((release) => Boolean(release.name));
    const shas = commits.map(({ hash }) => hash);

    const searchQueries = getSearchQueries(`repo:${owner}/${repo}+type:pr+is:merged`, shas).map(async (query) => {
      const x = await github.search.issuesAndPullRequests({ q: query });
      return x.data.items;
    });

    const dedupedQueries = uniqBy(flatten(await Promise.all(searchQueries)), (q) => q.number);

    const filterer = async (query: components['schemas']['issue-search-result-item']) => {
      const list = await github.pulls.listCommits({ owner, repo, pull_number: query.number });
      const includedInSHAs = list.data.find(({ sha }) => shas.includes(sha));
      if (includedInSHAs !== undefined) {
        return true;
      }

      const foundPR = await github.pulls.get({ owner, repo, pull_number: query.number });
      if (foundPR.data.merge_commit_sha == null) {
        return false;
      }

      return shas.includes(foundPR.data.merge_commit_sha);
    };

    const prs = await pFilter(dedupedQueries, filterer);

    $log.debug(
      'found pull requests: %O',
      prs.map((pr) => pr.number)
    );

    // Parse the release commits message and PRs body to find resolved issues/PRs via comment keywords
    const issuesAndPrs = [...prs.map((pr) => pr.body), ...commits.map((commit) => commit.message)];
    const issueNumbers = issuesAndPrs.reduce((issues: any[], message: string | undefined) => {
      if (message) {
        const parsed: {
          actions: Record<string, any>;
          refs: any[];
          mentions: any[];
        } = parser(message);

        const ids: { number: number }[] = parsed.actions.close
          .filter((action: { slug: string }) => action.slug == null || action.slug === `${owner}/${repo}`)
          .map((action: { issue: string }) => ({ number: Number.parseInt(action.issue, 10) }));

        return issues.concat(ids);
      }

      return issues;
    }, []);

    $log.debug('found issues via comments: %O', issuesAndPrs);

    // add success comments and assign release labels
    await Promise.all(
      uniqBy([...prs, ...issueNumbers], (q) => q.number).map(async (issue) => {
        if (issue.number == null) {
          return;
        }

        if (!successComment.enabled) {
          $log.info(`Skip commenting issue/pr #${issue.number}`);
        } else {
          const body = successComment.comment
            ? template(successComment.comment)({ ...this.context, issue })
            : getSuccessComment(issue, releaseInfos, this.context.nextRelease);
          try {
            const comment: RestEndpointMethodTypes['issues']['createComment']['parameters'] = {
              owner,
              repo,
              issue_number: issue.number,
              body,
            };

            $log.debug('create comment: %O', comment);

            const {
              data: { html_url: url },
            } = await github.issues.createComment(comment);
            $log.info('Added comment to issue #%d: %s', issue.number, url);
          } catch (error) {
            if (error.status === 403) {
              $log.error('Not allowed to add a comment to the issue #%d.', issue.number);
            } else if (error.status === 404) {
              $log.error("Failed to add a comment to the issue #%d as it doesn't exist.", issue.number);
            } else {
              this.errors.push(error);
              $log.error('Failed to add a comment to the issue #%d.', issue.number);
              // Don't throw right away and continue to update other issues
            }
          }
        }

        if (!releasedLabels.enabled) {
          $log.info(`Skip applying release labels to issue/pr #${issue.number}`);
        } else if (releasedLabels.enabled && releasedLabels.labels.length > 0) {
          try {
            const labels = releasedLabels.labels.map((label) => template(label)(this.context));
            // Don’t use .issues.addLabels for GHE < 2.16 support
            // https://github.com/semantic-release/github/issues/138
            await github.request('POST /repos/:owner/:repo/issues/:number/labels', {
              owner,
              repo,
              number: issue.number,
              data: labels,
            });
            $log.info('Added labels %O to issue #%d', labels, issue.number);
          } catch (error) {
            if (error.status === 403) {
              $log.error('Not allowed add released label to issue/pr #%d.', issue.number);
            } else if (error.status === 404) {
              $log.error("Failed to add a released label to the issue/pr #%d as it doesn't exist.", issue.number);
            } else {
              this.errors.push(error);
              $log.error('Failed to add a released label to the issue/pr #%d.', issue.number);
              // Don't throw right away and continue to update other issues
            }
          }
        }
      })
    );
  }

  private async closeFailedReleaseIssues(github: Octokit, owner: string, repo: string): Promise<void> {
    const { failComment } = this.resolvedOptions;
    const srIssues = await findSRIssues(github, failComment.failTitle, owner, repo);

    $log.debug('found semantic-release issues: %O', srIssues);

    await Promise.all(
      srIssues.map(async (issue) => {
        $log.debug('close issue: %O', issue);
        try {
          const updatedIssue: RestEndpointMethodTypes['issues']['update']['parameters'] = {
            owner,
            repo,
            issue_number: issue.number,
            state: 'closed',
          };

          $log.debug('closing issue: %O', updatedIssue);

          const {
            data: { html_url: url },
          } = await github.issues.update(updatedIssue);

          $log.info('Closed issue #%d: %s.', issue.number, url);
        } catch (error) {
          this.errors.push(error);
          $log.error('Failed to close the issue #%d.', issue.number);
          // Don't throw right away and continue to close other issues
        }
      })
    );
  }

  private async addReleases(
    github: Octokit,
    owner: string,
    repo: string,
    addReleases: false | 'bottom' | 'top',
    releases: Release[] | any[],
    nextRelease: NextRelease
  ): Promise<void> {
    const ghRelease = releases.find((release) => release.name && release.name === RELEASE_NAME);
    if (ghRelease != null) {
      const ghRelaseId = ghRelease.id;
      const additionalReleases = getReleaseLinks(releases);
      if (!isEmpty(additionalReleases) && ghRelaseId != null) {
        const newBody =
          addReleases === 'top'
            ? additionalReleases.concat('\n---\n', nextRelease.notes)
            : nextRelease.notes.concat('\n---\n', additionalReleases);
        await github.repos.updateRelease({ owner, repo, release_id: ghRelaseId, body: newBody });
      }
    }
  }
}
