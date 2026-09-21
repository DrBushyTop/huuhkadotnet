#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

repo='DrBushyTop/huuhkadotnet'
location='westeurope'
identity_group='huuhkadotnet-identity'
resource_group='huuhkadotnet-prod'
identity_name='huuhkadotnet-github'
subscription=$(az account show --query id -o tsv)
tenant=$(az account show --query tenantId -o tsv)
# GitHub may use an immutable subject containing owner and repository IDs.
subject_prefix=$(gh api "repos/$repo/actions/oidc/customization/sub" --jq '.sub_claim_prefix // empty')
subject_prefix=${subject_prefix:-repo:$repo}
scope="/subscriptions/$subscription/resourceGroups/$resource_group"

az group create --name "$identity_group" --location "$location" --output none
az group create --name "$resource_group" --location "$location" --output none
az identity create --name "$identity_name" --resource-group "$identity_group" --location "$location" --output none
principal=$(az identity show -g "$identity_group" -n "$identity_name" --query principalId -o tsv)
client=$(az identity show -g "$identity_group" -n "$identity_name" --query clientId -o tsv)
az identity federated-credential create --name github-production \
  --identity-name "$identity_name" --resource-group "$identity_group" \
  --issuer 'https://token.actions.githubusercontent.com' \
  --subject "$subject_prefix:environment:production" \
  --audiences 'api://AzureADTokenExchange' --output none

for role in 'Contributor' 'Storage Blob Data Contributor'; do
  az role assignment create --assignee-object-id "$principal" \
    --assignee-principal-type ServicePrincipal --role "$role" --scope "$scope" --output none
done

gh api --method PUT "repos/$repo/environments/production" --input - <<'JSON'
{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
if ! gh api "repos/$repo/environments/production/deployment-branch-policies" \
  --jq '.branch_policies[].name' | grep -qx master; then
  gh api --method POST "repos/$repo/environments/production/deployment-branch-policies" \
    -f name=master -f type=branch
fi

gh variable set AZURE_CLIENT_ID --repo "$repo" --env production --body "$client"
gh variable set AZURE_TENANT_ID --repo "$repo" --env production --body "$tenant"
gh variable set AZURE_SUBSCRIPTION_ID --repo "$repo" --env production --body "$subscription"
# Leave indexing blocked until the custom domain cutover.
if ! gh variable list --repo "$repo" --env production --json name --jq '.[].name' | grep -qx SITE_INDEXABLE; then
  gh variable set SITE_INDEXABLE --repo "$repo" --env production --body false
fi
printf 'Configured %s in subscription %s\n' "$identity_name" "$subscription"
