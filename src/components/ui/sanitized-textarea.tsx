import * as React from "react";
import { Textarea } from "./textarea";
import { sanitizeInput } from "@/utils/sanitize";

interface SanitizedTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * A wrapper around the Textarea component that automatically sanitizes input values
 * to protect against XSS attacks. Use this for any textarea that accepts user input.
 */
export function SanitizedTextarea({ value, onChange, ...props }: SanitizedTextareaProps) {
  // Handle the change event and sanitize the input before calling the parent onChange
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    onChange(sanitizedValue);
  };

  return (
    <Textarea
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
} 