// Addresses to show to Players: the public URL (tunnel) if set, otherwise the local network addresses.

/**
 * @param {{port: number, addresses: string[], publicUrl?: string}} options
 * @returns {string[]}
 */
export function playerUrls({ port, addresses, publicUrl }) {
  const url = publicUrl?.trim();
  if (url) return [url.endsWith("/") ? url : `${url}/`];
  const hosts = addresses.length ? addresses : ["127.0.0.1"];
  return hosts.map((host) => `http://${host}:${port}/`);
}
