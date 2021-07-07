/**
 * Determines if the provided release is a pre-release.
 */
export function isPrerelease({ type, main }: { type: string; main: string }): boolean {
  return type === 'prerelease' || (type === 'release' && !main);
}
