// Adresses à afficher pour les Joueurs : l'URL publique (tunnel) si elle est définie,
// sinon les adresses du réseau local.

/**
 * @param {{port: number, adresses: string[], publique?: string}} options
 * @returns {string[]}
 */
export function urlsJoueurs({ port, adresses, publique }) {
  const url = publique?.trim();
  if (url) return [url.endsWith("/") ? url : `${url}/`];
  const hotes = adresses.length ? adresses : ["127.0.0.1"];
  return hotes.map((hote) => `http://${hote}:${port}/`);
}
