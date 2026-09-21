#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .deployment
az deployment group create --resource-group huuhkadotnet-prod --name blog \
  --parameters deployment/prod.bicepparam --query properties.outputs -o json > .deployment-outputs.json
trap 'rm -f .deployment-outputs.json' EXIT
export MEDIA_BASE_URL
MEDIA_BASE_URL=$(jq -r .mediaBaseUrl.value .deployment-outputs.json)
export SITE_URL
SITE_URL=$(jq -r .siteUrl.value .deployment-outputs.json)
account=$(jq -r .storageName.value .deployment-outputs.json)
site=$(jq -r .siteName.value .deployment-outputs.json)
node deployment/prepare.mjs
az storage blob upload-batch --account-name "$account" --destination images \
  --source .deployment/images --auth-mode login --overwrite true \
  --content-cache-control 'public, max-age=3600' --only-show-errors --output none
# Resolve the SWA token at runtime using the federated identity. No GitHub secret is stored.
export SWA_CLI_DEPLOYMENT_TOKEN
SWA_CLI_DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name "$site" \
  --resource-group huuhkadotnet-prod --query properties.apiKey -o tsv)
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  printf '::add-mask::%s\n' "$SWA_CLI_DEPLOYMENT_TOKEN"
fi
npx --yes @azure/static-web-apps-cli@2.0.10 deploy .deployment/site --env production
unset SWA_CLI_DEPLOYMENT_TOKEN
# Allow the edge to finish updating before checking the published routes.
for attempt in 1 2 3 4 5; do
  if node deployment/verify.mjs; then exit 0; fi
  if [[ "$attempt" == 5 ]]; then exit 1; fi
  sleep 15
done
