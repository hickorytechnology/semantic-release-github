export type Asset =
  | string
  | string[]
  | {
      path: string;
      name: string;
      label: string;
    };
