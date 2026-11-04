/**
 * Plain function holding the logic, so it can be reused outside templates
 * (the docs advise NOT injecting pipe classes into services).
 * Docs: https://angular.dev/guide/templates/pipes#using-pipe-logic-outside-templates
 */
export function truncate(value: string | null | undefined, limit = 20, ellipsis = '…'): string {
  if (!value) return '';
  return value.length <= limit ? value : value.slice(0, Math.max(0, limit)).trimEnd() + ellipsis;
}
