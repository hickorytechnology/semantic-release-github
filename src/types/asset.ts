export type AssetConfigInput =
  | string
  | string[]
  | {
      path: string;
      label?: string;
      name?: string;
    };

export type Asset =
  | string
  | {
      path: string;
      label?: string;
      name?: string;
    };

export type GlobbedAsset =
  | string[]
  | {
      path: string;
      name: string;
      label?: string | undefined;
    }[]
  | {
      path: string;
      label?: string | undefined;
      name?: string | undefined;
    };
