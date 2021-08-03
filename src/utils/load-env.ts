import { EnvType, load } from 'ts-dotenv';

export const schema = {
  NODE_ENV: {
    type: String,
    optional: true,
  },
  DEBUG: {
    type: String,
    optional: true,
  },
};
export type Env = EnvType<typeof schema>;

/**
 * Import this to access the loaded environment config.
 */
// eslint-disable-next-line import/no-mutable-exports
export let env: Env;

export function loadEnv(): void {
  env = load(schema);
}
