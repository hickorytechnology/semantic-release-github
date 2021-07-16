import { OutgoingHttpHeaders } from 'http';
import { Options } from 'semantic-release';
import { Asset } from './asset';

export interface PluginOptions extends Options {
  /**
   * The token used to authenticate with GitHub.
   * Set by default to either the `GH_TOKEN` or `GITHUB_TOKEN` environment variables.
   */
  githubToken: string;

  /**
   * The GitHub endpoint.
   */
  githubUrl: string;

  /**
   * The GitHub API prefix.
   */
  githubApiPathPrefix: string;

  /**
   * The proxy to use to access the GitHub API.
   */
  proxy: {
    enabled: boolean;
    options:
      | string
      | {
          host: string;
          port: number;
          secureProxy: boolean;
          headers: OutgoingHttpHeaders;
        };
  };

  /**
   * An array of files to upload to the release.
   * Can be a glob or an `Array` of globs and `Objects` with the respective properties.
   */
  assets: Asset[];

  /**
   * The assignees to add to the issue created when a release fails.
   */
  assignees: string[];

  /**
   * The comment to add to each issue and pull request resolved by the release.
   */
  successComment: {
    /**
     * Whether or not the {@link successComment} should be applied to issues
     * and pull requests.
     */
    enabled:
      | boolean
      | ((name: string, type: string, channel: string, range: string, prerelease: boolean) => boolean);

    comment: string;
  };

  /**
   * Properties related to adding comments on failed releases.
   */
  failComment: {
    /**
     * Whether or not the {@link failComment} should be applied to issues
     * when a release fails.
     */
    enabled:
      | boolean
      | ((name: string, type: string, channel: string, range: string, prerelease: boolean) => boolean);

    /**
     * The title of the issue created when a release fails.
     */
    failTitle: string;

    /**
     * The content of the issue created when a release fails.
     */
    comment: string;
  };

  /**
   * The labels to add to the issue created when a release fails.
   */
  failLabels: {
    /**
     * Whether or not the fail labels should be applied when a release fails.
     */
    // eslint-disable-next-line max-len
    enabled:
      | boolean
      | ((name: string, type: string, channel: string, range: string, prerelease: boolean) => boolean);
    labels: string[];
  };

  /**
   * The labels to add to each issue and pull request resolve by this release.
   */
  releasedLabels: {
    /**
     * Whether or not the {@link releasedLabels} should be applied to resolved
     * issues and pull requests by this release.
     */
    // eslint-disable-next-line max-len
    enabled:
      | boolean
      | ((name: string, type: string, channel: string, range: string, prerelease: boolean) => boolean);
    labels: string[];
  };

  /**
   * Will add release links to the GitHub Release.
   */
  addReleases: false | 'bottom' | 'top';
}

/**
 * Represents the different ways the plugin options can be set. Ultimately used to resolve the
 * overall config into the {@link PluginOptions} type.
 */
export type PluginOptionInputs = { [K in keyof PluginOptions]: any };
