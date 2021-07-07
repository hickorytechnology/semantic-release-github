import SemanticReleaseError from '@semantic-release/error';
import { errors } from '../definitions/errors';

export function getError(code: string, ctx = {}): any {
  const { message, details } = errors[code](ctx);
  return new SemanticReleaseError(message, code, details);
}
