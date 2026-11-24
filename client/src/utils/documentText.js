// Extract display text without inserting saved markup into the live page.
export function documentText(content = '') {
  return new DOMParser().parseFromString(content, 'text/html').body.textContent || '';
}
