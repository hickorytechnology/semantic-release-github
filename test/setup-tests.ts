import 'setimmediate';
import { RETRY_CONF } from './helpers/rate-limit';

jest.mock('../src/definitions/rate-limit', () => ({
  get RETRY_CONF() {
    return RETRY_CONF;
  },
}));
