/**
 * Runtime auth config from /config.json (written by CDK deploy).
 * Set by main.jsx after fetch; read by config.js and signOut.js.
 */

let resolved = null

export function setResolvedConfig(config) {
  resolved = config
}

export function getResolvedConfig() {
  return resolved
}
