import path from 'path';
import { copy, ensureDir } from 'fs-extra';
import { sortBy } from 'lodash';
import tempy from 'tempy';
import { globAssets } from '../../src/utils/glob-assets';
import { Asset } from '../../src/types/asset';

const sortAssets = (assets: Asset[]): Asset[] =>
  sortBy(assets, (asset) => {
    if (Array.isArray(asset) || typeof asset === 'string') {
      return asset;
    }

    return asset.path;
  });

const fixtures = 'test/fixtures/files';

test('Retrieve file from single path', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['upload.txt']);

  expect(globbedAssets).toStrictEqual(['upload.txt']);
});

test('Retrieve multiple files from path', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['upload.txt', 'upload_other.txt']);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['upload_other.txt', 'upload.txt']));
});

test('Include missing files as defined, using Object definition', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['upload.txt', { path: 'miss*.txt', label: 'Missing' }]);

  expect(sortAssets(globbedAssets)).toStrictEqual(
    sortAssets(['upload.txt', { path: 'miss*.txt', label: 'Missing' }])
  );
});

test('Retrieve multiple files from Object', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [
    { path: 'upload.txt', name: 'upload_name', label: 'Upload label' },
    'upload_other.txt',
  ]);

  expect(sortAssets(globbedAssets)).toStrictEqual(
    sortAssets([{ path: 'upload.txt', name: 'upload_name', label: 'Upload label' }, 'upload_other.txt'])
  );
});

test('Retrieve multiple files without duplicates', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [
    'upload_other.txt',
    'upload.txt',
    'upload_other.txt',
    'upload.txt',
    'upload.txt',
    'upload_other.txt',
  ]);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['upload_other.txt', 'upload.txt']));
});

test('Favor Object over String values when removing duplicates', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [
    'upload_other.txt',
    'upload.txt',
    { path: 'upload.txt', name: 'upload_name' },
    'upload.txt',
    { path: 'upload_other.txt', name: 'upload_other_name' },
    'upload.txt',
    'upload_other.txt',
  ]);

  expect(sortAssets(globbedAssets)).toStrictEqual(
    sortAssets([
      { path: 'upload.txt', name: 'upload_name' },
      { path: 'upload_other.txt', name: 'upload_other_name' },
    ])
  );
});

test('Retrieve file from single glob', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['upload.*']);

  expect(globbedAssets).toStrictEqual(['upload.txt']);
});

test('Retrieve multiple files from single glob', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['*.txt']);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['upload_other.txt', 'upload.txt']));
});

test('Accept glob array with one value', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [['*load.txt'], ['*_other.txt']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['upload_other.txt', 'upload.txt']));
});

test('Include globs that resolve to no files as defined', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [['upload.txt', '!upload.txt']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['!upload.txt', 'upload.txt']));
});

test('Accept glob array with one value for missing files', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [['*missing.txt'], ['*_other.txt']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['upload_other.txt', '*missing.txt']));
});

test('Replace name by filename for Object that match multiple files', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [
    { path: '*.txt', name: 'upload_name', label: 'Upload label' },
  ]);

  expect(sortAssets(globbedAssets)).toStrictEqual(
    sortAssets([
      { path: 'upload.txt', name: 'upload.txt', label: 'Upload label' },
      { path: 'upload_other.txt', name: 'upload_other.txt', label: 'Upload label' },
    ])
  );
});

test('Include dotfiles', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['.dot*']);

  expect(sortAssets(globbedAssets)).toStrictEqual(sortAssets(['.dotfile']));
});

test('Ingnore single negated glob', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, ['!*.txt']);

  expect(sortAssets(globbedAssets)).toStrictEqual([]);
});

test('Ingnore single negated glob in Object', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [{ path: '!*.txt' }]);

  expect(sortAssets(globbedAssets)).toStrictEqual([]);
});

test('Accept negated globs', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [['*.txt', '!**/*_other.txt']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(['upload.txt']);
});

test('Expand directories', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, path.resolve(cwd, 'dir'));
  const globbedAssets = await globAssets({ cwd }, [['dir']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(
    sortAssets(['dir', 'dir/upload_other.txt', 'dir/upload.txt', 'dir/.dotfile'])
  );
});

test('Include empty directory as defined', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  await ensureDir(path.resolve(cwd, 'empty'));
  const globbedAssets = await globAssets({ cwd }, [['empty']]);

  expect(sortAssets(globbedAssets)).toStrictEqual(['empty']);
});

test('Deduplicate resulting files path', async () => {
  const cwd = tempy.directory();
  await copy(fixtures, cwd);
  const globbedAssets = await globAssets({ cwd }, [
    './upload.txt',
    path.resolve(cwd, 'upload.txt'),
    'upload.txt',
  ]);

  expect(globbedAssets.length).toBe(1);
});
