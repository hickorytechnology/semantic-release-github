import { $log } from '@tsed/logger';
import path from 'path';
import { castArray, uniqWith, uniq } from 'lodash';
import dirGlob from 'dir-glob';
import globby from 'globby';
import { Asset, AssetConfigInput, GlobbedAsset } from '../types/asset';

export async function globAssets({ cwd }: { cwd: any }, assets: AssetConfigInput[]): Promise<Asset[]> {
  if (typeof assets === 'string') {
    return [];
  }

  const allGlobbed = assets.map(async (asset): Promise<GlobbedAsset> => {
    let inferredPath: string | string[] = '';
    if (Array.isArray(asset) || typeof asset === 'string') {
      inferredPath = asset;
    } else {
      inferredPath = asset.path;
    }

    // wrap single glob definition in Array
    let glob = castArray(inferredPath);
    // TODO Temporary workaround for https://github.com/mrmlnc/fast-glob/issues/47
    glob = uniq([...(await dirGlob(glob, { cwd })), ...glob]);

    // Skip solo negated pattern (avoid to include every non js file with `!**/*.js`)
    if (glob.length <= 1 && glob[0].startsWith('!')) {
      $log.debug(
        'skipping the negated glob %o as its alone in its group and would retrieve a large amount of files',
        glob[0]
      );
      return [];
    }

    const globbed = await globby(glob, {
      cwd,
      expandDirectories: false, // TODO Temporary workaround for https://github.com/mrmlnc/fast-glob/issues/47
      gitignore: false,
      dot: true,
      onlyFiles: false,
    });

    if (!Array.isArray(asset) && typeof asset !== 'string') {
      if (globbed.length > 1) {
        // If asset is an Object with a glob on the `path` property that resolve to multiple files,
        // output an Object definition for each file matched and set each one with:
        // - `path` of the matched file
        // - `name` based on the actual file name (to avoid assets with duplicate `name`)
        // - other properties of the original asset definition
        return globbed.map((file) => ({ ...asset, path: file, name: path.basename(file) }));
      }

      // If asset is an Object, output an Object definition with:
      // - `path` of the matched file if there is one, or the original `path` definition (will be considered as a missing file)
      // - other properties of the original asset definition
      return { ...asset, path: globbed[0] || asset.path };
    }

    if (globbed.length > 0) {
      // If asset is a String definition, output each files matched
      return globbed;
    }

    // If asset is a String definition but no match is found, output the elements of the original glob (each one will be considered as a missing file)
    return glob;
  });

  const empty: GlobbedAsset[] = [];
  const resolved = [...(await Promise.all(allGlobbed))];
  const globbedAssets = empty.concat(...resolved) as Asset[];

  // Sort with Object first, to prioritize Object definition over Strings in dedup
  // eslint-disable-next-line no-confusing-arrow
  const sortedAssets = globbedAssets.sort((asset) =>
    !Array.isArray(asset) && typeof asset !== 'string' ? -1 : 1
  );

  return uniqWith(
    sortedAssets,
    // Compare `path` property if Object definition, value itself if String
    (a, b) =>
      path.resolve(cwd, typeof a === 'string' ? a : a.path) ===
      path.resolve(cwd, typeof b === 'string' ? b : b.path)
  );
}
