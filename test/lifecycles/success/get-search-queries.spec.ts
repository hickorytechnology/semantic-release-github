import { repeat } from 'lodash';
import { getSearchQueries } from '../../../src/lifecycles/success/get-search-queries';

test('Generate queries of 256 characters maximum', () => {
  const commits = [
    repeat('a', 40),
    repeat('b', 40),
    repeat('c', 40),
    repeat('d', 40),
    repeat('e', 40),
    repeat('f', 40),
  ];

  expect(getSearchQueries(repeat('0', 51), commits)).toStrictEqual([
    `${repeat('0', 51)}+${commits[0]}+${commits[1]}+${commits[2]}+${commits[3]}+${commits[4]}`,
    `${repeat('0', 51)}+${commits[5]}`,
  ]);

  expect(getSearchQueries(repeat('0', 52), commits)).toStrictEqual([
    `${repeat('0', 52)}+${commits[0]}+${commits[1]}+${commits[2]}+${commits[3]}`,
    `${repeat('0', 52)}+${commits[4]}+${commits[5]}`,
  ]);
});

test('Generate one query if it is less tahn 256 characters', () => {
  const commits = [repeat('a', 40), repeat('b', 40)];

  expect(getSearchQueries(repeat('0', 20), commits)).toStrictEqual([
    `${repeat('0', 20)}+${commits[0]}+${commits[1]}`,
  ]);
});

test('Return emty Array if there is no commits', () => {
  expect(getSearchQueries('base', [])).toStrictEqual([]);
});
