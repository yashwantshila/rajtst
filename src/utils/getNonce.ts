/**
 * Get the CSP nonce value from the document's meta tag
 * This should be used for inline scripts and styles to satisfy the Content Security Policy
 */
export function getNonce(): string {
  // Look for meta tag with name="csp-nonce" which contains the nonce value
  const nonceMetaTag = document.querySelector('meta[name="csp-nonce"]');
  return nonceMetaTag ? nonceMetaTag.getAttribute('content') || '' : '';
}

/**
 * Add nonce attribute to inline scripts or styles
 * @param props - additional props to include
 * @returns object with nonce attribute and original props
 */
export function withNonce<T extends Record<string, any>>(props?: T): T & { nonce: string } {
  const nonce = getNonce();
  return {
    ...(props || {}) as T,
    nonce
  };
} 