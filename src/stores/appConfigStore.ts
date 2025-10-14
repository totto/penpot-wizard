import { persistentAtom } from '@nanostores/persistent';

export type ChatVersion = 'v1' | 'v2';

export const $chatVersion = persistentAtom<ChatVersion>('chatVersion', 'v1', {
  encode: (value: ChatVersion) => value,
  decode: (value: string) => {
    if (value === 'v1' || value === 'v2') {
      return value;
    }
    return 'v1'; // Default fallback
  }
});

export const setChatVersion = (version: ChatVersion): void => {
  $chatVersion.set(version);
};

