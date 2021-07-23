import { Context } from 'semantic-release';
import { PluginOptions } from '../types/plugin-options';

export interface LifecycleHandler<TContext extends Context, TReturn> {
  handle(pluginOptions: PluginOptions, context: TContext): Promise<TReturn>;
}
