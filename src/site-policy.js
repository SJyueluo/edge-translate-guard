export function normalizeHost(host) {
  return String(host).trim().toLowerCase();
}

export function isHostEnabled(host, disabledHosts) {
  const normalizedHost = normalizeHost(host);
  return !disabledHosts.some((item) => normalizeHost(item) === normalizedHost);
}

export function updateDisabledHosts(disabledHosts, host, enabled) {
  const normalizedHost = normalizeHost(host);
  const existingHosts = [...new Set(disabledHosts.map(normalizeHost).filter(Boolean))];
  if (!normalizedHost) return existingHosts;
  return enabled
    ? existingHosts.filter((item) => item !== normalizedHost)
    : existingHosts.includes(normalizedHost) ? existingHosts : [...existingHosts, normalizedHost];
}
