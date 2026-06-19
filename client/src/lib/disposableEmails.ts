export const DISPOSABLE_EMAIL_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "yopmail.com",
  "10minutemail.com",
  "dispostable.com",
  "getairmail.com",
  "maildrop.cc",
  "trashmail.com",
  "tempmail.net",
  "tempmail.dev",
  "mailnesia.com",
  "mailinator.net",
  "mailnator.com"
];

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split("@").pop()?.toLowerCase() || "";
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

export function validateEmailAddress(email: string): {
  isValid: boolean;
  errorKey?: "invalid" | "disposable";
} {
  if (!email) return { isValid: false, errorKey: "invalid" };

  const trimmed = email.trim();
  // Standard email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, errorKey: "invalid" };
  }

  if (isDisposableEmail(trimmed)) {
    return { isValid: false, errorKey: "disposable" };
  }

  return { isValid: true };
}
