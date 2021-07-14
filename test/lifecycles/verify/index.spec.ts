import SemanticReleaseError from '@semantic-release/error';
import { $log } from '@tsed/logger';
import AggregateError from 'aggregate-error';
import { cleanAll } from 'nock';
import { GlobalConfig } from 'semantic-release';
import { verifyGitHub } from '../../../src/lifecycles/verify';
import { PluginOptions } from '../../../src/types/plugin-options';
import { resolveConfig } from '../../../src/utils/resolve-config';
import { authenticate } from '../../helpers/mock-github';

/* eslint camelcase: ["error", {properties: "never"}] */

// const verify = proxyquire('../lib/verify', {
//   './get-client': proxyquire('../lib/get-client', { './definitions/rate-limit': rateLimit }),
// });

jest.mock('@tsed/logger');

afterEach(() => {
  // Clear nock
  cleanAll();
});

test('Verify package, token and repository access', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const pluginOptions = {
    proxy: {
      enabled: true,
      options: 'https://localhost',
    },
    assets: [{ path: 'lib/file.js' }, 'file.js'],
    successComment: {
      enabled: true,
      comment: 'Test comment',
    },
    failComment: {
      enabled: true,
      comment: 'Test comment',
      failTitle: 'Test title',
    },
    failLabels: {
      enabled: true,
      labels: ['semantic-release'],
    },
  } as PluginOptions;

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git+https://othertesturl.com/${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

// eslint-disable-next-line max-len
test('Verify package, token and repository access with "proxy", "asset", "successComment", "failTitle", "failComment" and "label" set to "undefined"', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git+https://othertesturl.com/${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      proxy: undefined,
      assets: undefined,
      successComment: undefined,
      failComment: undefined,
      failLabels: undefined,
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

test('Verify package, token and repository access and custom URL with prefix', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };

  const pluginOptions = {
    githubUrl: 'https://othertesturl.com:9090',
    githubApiPathPrefix: 'prefix',
  } as PluginOptions;

  const github = authenticate(env, {
    githubUrl: pluginOptions.githubUrl,
    githubApiPathPrefix: pluginOptions.githubApiPathPrefix,
  })
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
  expect($log.debug).toBeCalledWith(
    'Verify GitHub authentication (%s)',
    'https://othertesturl.com:9090/prefix'
  );
});

test('Verify package, token and repository access and custom URL without prefix', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };

  const pluginOptions = {
    githubUrl: 'https://othertesturl.com:9090',
  } as PluginOptions;

  const github = authenticate(env, { githubUrl: pluginOptions.githubUrl })
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
  expect($log.debug).toBeCalledWith('Verify GitHub authentication (%s)', 'https://othertesturl.com:9090');
});

test('Verify package, token and repository access and shorthand repositoryUrl URL', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };

  const pluginOptions = {
    githubUrl: 'https://othertesturl.com:9090',
  } as PluginOptions;

  const github = authenticate(env, { githubUrl: pluginOptions.githubUrl })
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `github:${owner}/${repo}` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
  expect($log.debug).toBeCalledWith('Verify GitHub authentication (%s)', 'https://othertesturl.com:9090');
});

test('Verify package, token and repository with environment variables', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {
    GH_URL: 'https://othertesturl.com:443',
    GH_TOKEN: 'github_token',
    GH_PREFIX: 'prefix',
    HTTP_PROXY: 'https://localhost',
  };
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub({} as PluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
  expect($log.debug).toBeCalledWith(
    'Verify GitHub authentication (%s)',
    'https://othertesturl.com:443/prefix'
  );
});

test('Verify package, token and repository access with alternative environment variables', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = {
    GITHUB_URL: 'https://othertesturl.com:443',
    GITHUB_TOKEN: 'github_token',
    GITHUB_PREFIX: 'prefix',
  };
  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub({} as PluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

test('Verify "proxy" options are a String', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const pluginOptions = {
    proxy: {
      enabled: true,
      options: 'https://locahost',
    },
  } as PluginOptions;

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

test('Verify "proxy" options are an object with "host" and "port" properties', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const pluginOptions = {
    proxy: {
      enabled: true,
      options: { host: 'locahost', port: 80 },
    },
  } as PluginOptions;

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

test('Verify "proxy.enabled" is a Boolean set to false', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      proxy: { enabled: false },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(
    verifyGitHub(pluginOptions, {
      env,
      options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).resolves.not.toThrow();

  expect(github.isDone()).toBe(true);
});

test('Verify "assets" is a String', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assets: 'file2.js',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "assets" is an Object with a path property', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assets: { path: 'file2.js' },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "assets" is an Array of Object with a path property', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assets: [{ path: 'file1.js' }, { path: 'file2.js' }],
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "assets" is an Array of glob Arrays', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assets: [['dist/**', '!**/*.js'], 'file2.js'],
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "assets" is an Array of Object with a glob Arrays in path property', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assets: [{ path: ['dist/**', '!**/*.js'] }, { path: 'file2.js' }],
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "failLabels" options are a String', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      failLabels: {
        enabled: true,
        options: 'semantic-release',
      },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "assignees" is a String', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      assignees: 'user',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "addReleases" is a valid string (top)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      addReleases: 'top',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "addReleases" is a valid string (bottom)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      addReleases: 'bottom',
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

test('Verify "addReleases" is valid (enabled: false)', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GH_TOKEN: 'github_token' };
  const context = {
    env,
    options: { repositoryUrl: `git@othertesturl.com:${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      addReleases: {
        enabled: false,
      },
    },
    context
  );

  const github = authenticate(env)
    .get(`/repos/${owner}/${repo}`)
    .reply(200, { permissions: { push: true } });

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
  expect(github.isDone()).toBe(true);
});

// https://github.com/semantic-release/github/issues/182
test('Verify if run in GitHub Action', async () => {
  const owner = 'test_user';
  const repo = 'test_repo';
  const env = { GITHUB_TOKEN: 'v1.1234567890123456789012345678901234567890', GITHUB_ACTION: 'Release' };
  const context = {
    env,
    options: { repositoryUrl: `git+https://othertesturl.com/${owner}/${repo}.git` } as GlobalConfig,
    logger: { log: jest.fn(), error: jest.fn() },
  };

  const pluginOptions = resolveConfig(
    {
      proxy: {
        enabled: true,
        options: 'https://localhost',
      },
      assets: [{ path: 'lib/file.js' }, 'file.js'],
      successComment: {
        enabled: true,
        comment: 'Test comment',
      },
      failComment: {
        enabled: true,
        failTitle: 'Fail title',
        comment: 'Test comment',
      },
      failLabels: ['semantic-release'],
    },
    context
  );

  await expect(verifyGitHub(pluginOptions, context)).resolves.not.toThrow();
});

test('Throw SemanticReleaseError for missing github token', async () => {
  await expect(
    verifyGitHub({} as PluginOptions, {
      env: {},
      options: { repositoryUrl: 'https://github.com/semantic-release/github.git' } as GlobalConfig,
      logger: { log: jest.fn(), error: jest.fn() },
    })
  ).rejects.toThrow(AggregateError);

  // t.is(errors.length, 0);
  // t.is(error.name, 'SemanticReleaseError');
  // t.is(error.code, 'ENOGHTOKEN');
});

// test('Throw SemanticReleaseError for invalid token', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const github = authenticate(env).get(`/repos/${owner}/${repo}`).reply(401);

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       {},
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDGHTOKEN');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError for invalid repositoryUrl', async () => {
//   const env = { GH_TOKEN: 'github_token' };

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub({}, { env, options: { repositoryUrl: 'invalid_url' }, logger: jest.fn() })
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDGITHUBURL');
// });

// test("Throw SemanticReleaseError if token doesn't have the push permission on the repository and it's not a Github installation token", async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: false } })
//     .head('/installation/repositories')
//     .query({ per_page: 1 })
//     .reply(403);

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       {},
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EGHNOPERMISSION');
//   expect(github.isDone()).toBe(true);
// });

// test("Do not throw SemanticReleaseError if token doesn't have the push permission but it is a Github installation token", async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: false } })
//     .head('/installation/repositories')
//     .query({ per_page: 1 })
//     .reply(200);

//   await t.notThrowsAsync(
//     verifyGitHub(
//       {},
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   expect(github.isDone()).toBe(true);
// });

// test("Throw SemanticReleaseError if the repository doesn't exist", async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const github = authenticate(env).get(`/repos/${owner}/${repo}`).times(4).reply(404);

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       {},
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EMISSINGREPO');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw error if github return any other errors', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const github = authenticate(env).get(`/repos/${owner}/${repo}`).reply(500);

//   const error = await t.throwsAsync(
//     verifyGitHub(
//       {},
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(error.status, 500);
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "proxy" option is not a String or an Object', async () => {
//   const env = { GH_TOKEN: 'github_token' };
//   const proxy = 42;

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { proxy },
//       {
//         env,
//         options: { repositoryUrl: 'https://github.com/semantic-release/github.git' },
//         logger: { log: jest.fn(), error: jest.fn() },
//       }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDPROXY');
// });

// test('Throw SemanticReleaseError if "proxy" option is an Object with invalid properties', async () => {
//   const env = { GH_TOKEN: 'github_token' };
//   const proxy = { host: 42 };

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { proxy },
//       {
//         env,
//         options: { repositoryUrl: 'https://github.com/semantic-release/github.git' },
//         logger: { log: jest.fn(), error: jest.fn() },
//       }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDPROXY');
// });

// test('Throw SemanticReleaseError if "assets" option is not a String or an Array of Objects', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assets = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assets },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSETS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assets" option is an Array with invalid elements', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assets = ['file.js', 42];
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assets },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSETS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assets" option is an Object missing the "path" property', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assets = { name: 'file.js' };
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assets },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSETS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assets" option is an Array with objects missing the "path" property', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assets = [{ path: 'lib/file.js' }, { name: 'file.js' }];
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assets },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSETS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "successComment" option is not a String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const successComment = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { successComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDSUCCESSCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "successComment" option is an empty String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const successComment = '';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { successComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDSUCCESSCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "successComment" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const successComment = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { successComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDSUCCESSCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failTitle" option is not a String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failTitle = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failTitle },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILTITLE');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failTitle" option is an empty String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failTitle = '';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failTitle },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILTITLE');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failTitle" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failTitle = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failTitle },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILTITLE');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failComment" option is not a String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failComment = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failComment" option is an empty String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failComment = '';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "failComment" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const failComment = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { failComment },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDFAILCOMMENT');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "labels" option is not a String or an Array of String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const labels = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { labels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "labels" option is an Array with invalid elements', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const labels = ['label1', 42];
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { labels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "labels" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const labels = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { labels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assignees" option is not a String or an Array of String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assignees = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assignees },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSIGNEES');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assignees" option is an Array with invalid elements', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assignees = ['user', 42];
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assignees },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSIGNEES');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "assignees" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const assignees = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { assignees },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDASSIGNEES');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "releasedLabels" option is not a String or an Array of String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const releasedLabels = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { releasedLabels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDRELEASEDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "releasedLabels" option is an Array with invalid elements', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const releasedLabels = ['label1', 42];
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { releasedLabels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDRELEASEDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "releasedLabels" option is a whitespace String', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const releasedLabels = '  \n \r ';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { releasedLabels },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDRELEASEDLABELS');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "addReleases" option is not a valid string (botom)', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const addReleases = 'botom';
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { addReleases },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDADDRELEASES');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "addReleases" option is not a valid string (true)', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const addReleases = true;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { addReleases },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDADDRELEASES');
//   expect(github.isDone()).toBe(true);
// });

// test('Throw SemanticReleaseError if "addReleases" option is not a valid string (number)', async () => {
//   const owner = 'test_user';
//   const repo = 'test_repo';
//   const env = { GH_TOKEN: 'github_token' };
//   const addReleases = 42;
//   const github = authenticate(env)
//     .get(`/repos/${owner}/${repo}`)
//     .reply(200, { permissions: { push: true } });

//   const [error, ...errors] = await t.throwsAsync(
//     verifyGitHub(
//       { addReleases },
//       { env, options: { repositoryUrl: `https://github.com/${owner}/${repo}.git` }, logger: jest.fn() }
//     )
//   );

//   t.is(errors.length, 0);
//   t.is(error.name, 'SemanticReleaseError');
//   t.is(error.code, 'EINVALIDADDRELEASES');
//   expect(github.isDone()).toBe(true);
// });
