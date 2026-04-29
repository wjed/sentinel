/**
 * Runtime auth config from /config.json (written by Terraform via aws_s3_object.runtime_config).
 * Set by main.jsx after fetch; read by config.js and signOut.js.
 */

let resolved = null

export function setResolvedConfig(config) {
  resolved = config
}

export function getResolvedConfig() {
  return resolved
}
