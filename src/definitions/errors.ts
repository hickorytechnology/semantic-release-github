/* eslint-disable max-len */
import { inspect } from 'util';
import { isString } from 'lodash';
// import pkg from '../../package.json';

// const [homepage] = pkg.homepage.split('#');
const homepage = 'https://github.com/semantic-release/github';

// eslint-disable-next-line no-confusing-arrow
const stringify = (object: string | Record<string, unknown>) =>
  isString(object) ? object : inspect(object, { breakLength: Infinity, depth: 2, maxArrayLength: 5 });

const linkify = (file: string) => `${homepage}/blob/master/${file}`;

const errors: Record<string, any> = {
  EINVALIDASSETS: ({ assets }: { assets: any }) => ({
    message: 'Invalid `assets` option.',
    details: `The [assets option](${linkify(
      'README.md#assets'
    )}) must be an \`Array\` of \`Strings\` or \`Objects\` with a \`path\` property.

Your configuration for the \`assets\` option is \`${stringify(assets)}\`.`,
  }),
  EINVALIDSUCCESSCOMMENT: ({ successComment }: { successComment: any }) => ({
    message: 'Invalid `successComment` option.',
    details: `The [successComment option](${linkify(
      'README.md#successcomment'
    )}) if defined, must be a non empty \`String\`.

Your configuration for the \`successComment\` option is \`${stringify(successComment)}\`.`,
  }),
  EINVALIDFAILTITLE: ({ failTitle }: { failTitle: any }) => ({
    message: 'Invalid `failTitle` option.',
    details: `The [failTitle option](${linkify(
      'README.md#failtitle'
    )}) if defined, must be a non empty \`String\`.

Your configuration for the \`failTitle\` option is \`${stringify(failTitle)}\`.`,
  }),
  EINVALIDFAILCOMMENT: ({ failComment }: { failComment: any }) => ({
    message: 'Invalid `failComment` option.',
    details: `The [failComment option](${linkify(
      'README.md#failcomment'
    )}) if defined, must be a non empty \`String\`.

Your configuration for the \`failComment\` option is \`${stringify(failComment)}\`.`,
  }),
  EINVALIDLABELS: ({ labels }: { labels: any }) => ({
    message: 'Invalid `labels` option.',
    details: `The [labels option](${linkify(
      'README.md#options'
    )}) if defined, must be an \`Array\` of non empty \`String\`.

Your configuration for the \`labels\` option is \`${stringify(labels)}\`.`,
  }),
  EINVALIDASSIGNEES: ({ assignees }: { assignees: any }) => ({
    message: 'Invalid `assignees` option.',
    details: `The [assignees option](${linkify(
      'README.md#options'
    )}) must be an \`Array\` of non empty \`Strings\`.

Your configuration for the \`assignees\` option is \`${stringify(assignees)}\`.`,
  }),
  EINVALIDRELEASEDLABELS: ({ releasedLabels }: { releasedLabels: any }) => ({
    message: 'Invalid `releasedLabels` option.',
    details: `The [releasedLabels option](${linkify(
      'README.md#options'
    )}) if defined, must be an \`Array\` of non empty \`String\`.

Your configuration for the \`releasedLabels\` option is \`${stringify(releasedLabels)}\`.`,
  }),
  EINVALIDADDRELEASES: ({ addReleases }: { addReleases: any }) => ({
    message: 'Invalid `addReleases` option.',
    details: `The [addReleases option](${linkify(
      'README.md#options'
    )}) if defined, must be one of \`false|top|bottom\`.

Your configuration for the \`addReleases\` option is \`${stringify(addReleases)}\`.`,
  }),
  EINVALIDGITHUBURL: () => ({
    message: 'The git repository URL is not a valid GitHub URL.',
    details: `The **semantic-release** \`repositoryUrl\` option must a valid GitHub URL with the format \`<GitHub_or_GHE_URL>/<owner>/<repo>.git\`.

By default the \`repositoryUrl\` option is retrieved from the \`repository\` property of your \`package.json\` or the [git origin url](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes) of the repository cloned by your CI environment.`,
  }),
  EINVALIDPROXY: ({ proxy }: { proxy: any }) => ({
    message: 'Invalid `proxy` option.',
    details: `The [proxy option](${linkify(
      'README.md#proxy'
    )}) must be a \`String\`  or an \`Objects\` with a \`host\` and a \`port\` property.

Your configuration for the \`proxy\` option is \`${stringify(proxy)}\`.`,
  }),
  EMISSINGREPO: ({ owner, repo }: { owner: string; repo: string }) => ({
    message: `The repository ${owner}/${repo} doesn't exist.`,
    details: `The **semantic-release** \`repositoryUrl\` option must refer to your GitHub repository. The repository must be accessible with the [GitHub API](https://developer.github.com/v3).

By default the \`repositoryUrl\` option is retrieved from the \`repository\` property of your \`package.json\` or the [git origin url](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes) of the repository cloned by your CI environment.

If you are using [GitHub Enterprise](https://enterprise.github.com) please make sure to configure the \`githubUrl\` and \`githubApiPathPrefix\` [options](${linkify(
      'README.md#options'
    )}).`,
  }),
  EGHNOPERMISSION: ({ owner, repo }: { owner: string; repo: string }) => ({
    message: `The GitHub token doesn't allow to push on the repository ${owner}/${repo}.`,
    details: `The user associated with the [GitHub token](${linkify(
      'README.md#github-authentication'
    )}) configured in the \`GH_TOKEN\` or \`GITHUB_TOKEN\` environment variable must allows to push to the repository ${owner}/${repo}.

Please make sure the GitHub user associated with the token is an [owner](https://help.github.com/articles/permission-levels-for-a-user-account-repository/#owner-access-on-a-repository-owned-by-a-user-account) or a [collaborator](https://help.github.com/articles/permission-levels-for-a-user-account-repository/#collaborator-access-on-a-repository-owned-by-a-user-account) if the reposotory belong to a user account or has [write permissions](https://help.github.com/articles/managing-team-access-to-an-organization-repository) if the repository [belongs to an organization](https://help.github.com/articles/repository-permission-levels-for-an-organization).`,
  }),
  EINVALIDGHTOKEN: ({ owner, repo }: { owner: string; repo: string }) => ({
    message: 'Invalid GitHub token.',
    details: `The [GitHub token](${linkify(
      'README.md#github-authentication'
    )}) configured in the \`GH_TOKEN\` or \`GITHUB_TOKEN\` environment variable must be a valid [personal token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line) allowing to push to the repository ${owner}/${repo}.

Please make sure to set the \`GH_TOKEN\` or \`GITHUB_TOKEN\` environment variable in your CI with the exact value of the GitHub personal token.`,
  }),
  ENOGHTOKEN: ({ owner, repo }: { owner: string; repo: string }) => ({
    message: 'No GitHub token specified.',
    details: `A [GitHub personal token](${linkify(
      'README.md#github-authentication'
    )}) must be created and set in the \`GH_TOKEN\` or \`GITHUB_TOKEN\` environment variable on your CI environment.

Please make sure to create a [GitHub personal token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line) and to set it in the \`GH_TOKEN\` or \`GITHUB_TOKEN\` environment variable on your CI environment. The token must allow to push to the repository ${owner}/${repo}.`,
  }),
};

export { errors };
