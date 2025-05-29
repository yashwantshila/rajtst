# Application Security Overview

## Cross-Site Scripting (XSS) Protection

This application has implemented several measures to protect against Cross-Site Scripting (XSS) attacks:

### 1. Input Sanitization

All user inputs are sanitized to prevent XSS attacks. We've implemented two levels of sanitization:

#### HTML Content Sanitization

For content that needs to be rendered as HTML (like rich text content in about pages, guides, etc.), we use:

```typescript
import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string | undefined | null): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html);
};
```

This sanitizes HTML content and removes potentially malicious scripts before rendering with `dangerouslySetInnerHTML`.

#### Plain Text Input Sanitization

For regular form inputs (usernames, emails, addresses, etc.), we use:

```typescript
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
```

This escapes special characters that could be used in XSS attacks.

### 2. Sanitized Input Components

We've created custom components that automatically sanitize user input:

- `SanitizedInput`: A wrapper around the standard Input component
- `SanitizedTextarea`: A wrapper around the standard Textarea component

These components automatically sanitize any input as users type, ensuring that no malicious scripts can be injected.

### 3. Higher-Order Component for Form Sanitization

For existing forms or more complex scenarios, we provide a higher-order component (HOC) called `withSanitizedInputs` that can wrap any form component and automatically sanitize all input values:

```tsx
import { withSanitizedInputs } from '@/utils/sanitize-form';

// Your original form component
function MyFormComponent(props) {
  // ...
}

// Export a sanitized version of the component
export default withSanitizedInputs(MyFormComponent);
```

This HOC intercepts all onChange handlers and sanitizes their values before passing them to the wrapped component, making it easy to add XSS protection to existing forms without changing their implementation.

### 4. Where It's Applied

These security measures have been applied to all user input forms including:

- Authentication forms (login, registration, password reset)
- Profile data forms
- Prize claim forms
- Admin forms
- Withdrawal request forms
- Content submission forms

### 5. Best Practices

In addition to these measures, we follow these security best practices:

- All form validation is performed on both client and server sides
- Input validation is performed before sanitization
- Authentication and session management follow secure practices
- Regular security audits are conducted

## How to Use Sanitized Components

### Using Sanitized Input Components

When developing new features, always use the sanitized components for user inputs:

```tsx
// Instead of this
<Input 
  value={formData.username}
  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
/>

// Use this
<SanitizedInput
  value={formData.username}
  onChange={(value) => setFormData({ ...formData, username: value })}
/>
```

### Using the Higher-Order Component

For existing components or complex forms, use the HOC approach:

```tsx
// In your form component file:
import { withSanitizedInputs } from '@/utils/sanitize-form';

function ContactForm(props) {
  // Your existing form implementation
  return (
    <form>
      {/* ... */}
    </form>
  );
}

// Export the sanitized version
export default withSanitizedInputs(ContactForm);
```

### For Rendering HTML Content

For any HTML content that needs to be rendered:

```tsx
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
``` 