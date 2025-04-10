
/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Custom interface to define serializable versions of objects
 * to prevent DataCloneError when using postMessage
 */
interface SerializableFriendly {
  toJSON?: () => object;
}
