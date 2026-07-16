import { z } from "zod";

export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let clean = input.trim();
  // Strip script tags and their content
  clean = clean.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
  // Strip HTML tags
  clean = clean.replace(/<[^>]*>/g, "");
  return clean;
}

/**
 * Zod schema helper for sanitized strings with max length validation.
 */
export const sanitizedString = (maxLength = 255) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((val) => sanitizeHtml(val));
