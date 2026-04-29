locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # ── Site URL resolution ───────────────────────────────────────────────────
  #
  # custom_domain mode  → use var.domain_name (known at plan time, no CloudFront dep)
  # cloudfront_only     → use var.site_url_override if set, otherwise "PENDING"
  #
  # For a cloudfront_only deploy with SOC backend:
  #   1. First apply with create_soc_backend = false → note cloudfront_domain output
  #   2. Set site_url_override = "https://<cloudfront-domain>" in tfvars
  #   3. Re-apply with create_soc_backend = true
  #
  site_url = (
    var.enable_custom_domain
    ? "https://${var.domain_name}"
    : (
      var.site_url_override != null
      ? var.site_url_override
      : "https://PENDING_REPLACE_WITH_CLOUDFRONT_URL"
    )
  )

  # ── Cognito callback / logout URLs ────────────────────────────────────────
  cognito_callback_urls = compact([
    "${local.site_url}/",
    "http://localhost:5173/",
    "http://localhost:3000/",
  ])

  cognito_logout_urls = compact([
    "${local.site_url}/",
    "http://localhost:5173/",
    "http://localhost:3000/",
  ])

  # ── SOC-specific Cognito callback URLs ───────────────────────────────────
  soc_callback_urls = compact([
    "${local.site_url}/thehive/",
    "${local.site_url}/grafana/login/generic_oauth",
    var.enable_custom_domain ? "https://api.${var.domain_name}/oauth2/idpresponse" : null,
    "${local.site_url}/oauth2/idpresponse",
    "http://localhost:5173/",
    "http://localhost:3000/",
  ])

  # ── Common resource tags ──────────────────────────────────────────────────
  common_tags = merge(var.tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  })

  # ── Paths to Lambda source directories (relative to Terraform root) ───────
  lambda_root         = "${path.root}/../lambda"
  backend_lambda_root = "${path.root}/../../backend/lambda"
}
