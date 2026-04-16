/**
 * Generate a URL-safe slug from template ID and random suffix
 * Format: {template-id}-{random-8-chars}
 * Example: birthday-template-1-a7f3k2m9
 */
export function generateSlug(templateId) {
  const randomSuffix = Math.random()
    .toString(36)
    .substring(2, 10)
    .toLowerCase();
  const cleanTemplateId = templateId
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
  return `${cleanTemplateId}-${randomSuffix}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 5 && slug.length <= 100;
}
