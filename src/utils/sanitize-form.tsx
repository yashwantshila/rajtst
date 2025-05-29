import React, { ComponentType } from 'react';
import { sanitizeInput } from './sanitize';

/**
 * A higher-order component that wraps a form component and sanitizes all
 * the inputs before they are passed to the original component's handlers.
 * 
 * Use this to automatically sanitize inputs in forms to prevent XSS attacks.
 * 
 * @param WrappedComponent The form component to wrap
 * @returns A new component with auto-sanitizing inputs
 */
export function withSanitizedInputs<P extends object>(
  WrappedComponent: ComponentType<P>
): React.FC<P> {
  const WithSanitizedInputs: React.FC<P> = (props) => {
    // Create a proxy to intercept event handlers
    const sanitizedProps = new Proxy(props as any, {
      get(target, prop) {
        const value = target[prop];
        
        // If this is an onChange handler for an input
        if (typeof value === 'function' && prop.toString().startsWith('onChange')) {
          // Return a new function that wraps the original handler
          return function(this: any, ...args: any[]) {
            const event = args[0];
            
            // If this is a change event with a target value
            if (event && event.target && typeof event.target.value === 'string') {
              // Create a new event with a sanitized value
              const newEvent = {
                ...event,
                target: {
                  ...event.target,
                  value: sanitizeInput(event.target.value)
                }
              };
              
              // Call the original handler with the sanitized event
              return value.apply(this, [newEvent]);
            }
            
            // Otherwise, just call the original handler
            return value.apply(this, args);
          };
        }
        
        return value;
      }
    });
    
    return <WrappedComponent {...sanitizedProps} />;
  };
  
  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithSanitizedInputs.displayName = `WithSanitizedInputs(${wrappedName})`;
  
  return WithSanitizedInputs;
} 