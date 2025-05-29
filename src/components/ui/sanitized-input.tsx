import * as React from "react";
import { Input } from "./input";
import { sanitizeInput } from "@/utils/sanitize";

interface SanitizedInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/**
 * A wrapper around the Input component that automatically sanitizes input values
 * to protect against XSS attacks. Use this for any text input that accepts user input.
 */
export function SanitizedInput({ value, onChange, ...props }: SanitizedInputProps) {
  // Handle the change event and sanitize the input before calling the parent onChange
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    onChange(sanitizedValue);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
} 