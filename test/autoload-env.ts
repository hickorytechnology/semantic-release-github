import { load } from 'ts-dotenv';
import { schema } from '../src/utils/load-env';

const env = load(schema);
process.env = env;
