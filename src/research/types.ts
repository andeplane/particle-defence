export type ResearchNodeMeta = {
  id: string;
  name: string;
  description: string;
  cost: number;
  durationMs: number;
  requires?: string[];
};

/** One purchasable level within a ResearchPath. E is the class-local effect type, opaque to the registry. */
export type ResearchLevel<E> = {
  cost: number;
  effect: E;
};

export type ResearchPath<E> = {
  id: string;
  name: string;
  description: string;
  requires?: string[];
  levels: ResearchLevel<E>[];
};

/** Generic metadata container for any game object. E is defined locally in each class file. */
export type GameObjectMeta<E = unknown> = {
  typeName: string;
  category: 'particle' | 'tower';
  unlock?: ResearchNodeMeta;
  upgradePaths: ResearchPath<E>[];
};
