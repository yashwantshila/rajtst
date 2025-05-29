import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html HTML content to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html);
};

/**
 * Sanitizes plain text input to prevent XSS attacks
 * Especially useful for form inputs that should never contain HTML
 * @param text Text to sanitize
 * @returns Sanitized text string
 */
export const sanitizeInput = (text: string | undefined | null): string => {
  if (!text) return '';
  
  // Remove HTML tags and encode special characters to prevent script injection
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}; 