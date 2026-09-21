# Azure deployment

The Git root is this Astro app. All commands below run from that root.

`main.bicep` provisions an Azure Static Web App and an Azure Storage account in
`huuhkadotnet-prod`. `prod.bicepparam` selects West Europe and the Standard hosting
tier. Standard incurs a monthly hosting charge; Blob Storage adds usage charges.
You can choose Free in the parameter file if you accept its limits and lack of SLA.

The `images` container permits anonymous reads of individual blobs. Uploads use
Entra ID. Shared storage keys are disabled. Blob and container soft delete retain
deletions for seven days. The pipeline never deletes old images, including images
uploaded directly by the editor.

## Identity and GitHub

`bootstrap.sh` creates `huuhkadotnet-identity` and the user-assigned identity
`huuhkadotnet-github` in the currently selected Azure subscription. It grants
Contributor and Storage Blob Data Contributor on `huuhkadotnet-prod` only.
The identity has no role-assignment permission and no subscription-wide role.

GitHub's `production` environment only accepts deployments from `master`.
The federated credential trusts `repo:DrBushyTop@22717844/huuhkadotnet@1379384803:environment:production`
using GitHub's immutable owner and repository IDs.
The environment contains the client, tenant and subscription IDs as variables.
There are no stored Azure credentials or deployment-token secrets in GitHub.

The Blog workflow builds and tests pull requests. Pushes to `master` and manual
runs on `master` also deploy. The deploy job signs in with OIDC, applies Bicep,
uploads images, retrieves the Static Web Apps deployment token at runtime and
publishes the site. It masks that token in Actions logs. A final HTTP check covers
all pages, image URLs, AMP redirects, RSS, sitemap and the 404 response.

To recreate the bootstrap configuration with Azure CLI and GitHub CLI signed in:

```sh
bash deployment/bootstrap.sh
```

## Images and authoring

Keep local assets under `public/images/` with `/images/...` references in MDX.
Normal development and builds work without Azure access. Deployment copies the
build into ignored `.deployment/site`, maps image attributes, image links and
structured metadata to Blob URLs, and removes images from the app package.
It stages images separately under `.deployment/images`, excluding provenance JSON.
Code examples and article prose are unchanged. Blob cache lifetime is one hour,
so replacing an image can take that long to appear. Use a new filename for an
immediate change.

The editor can also upload directly and save HTTPS Blob URLs in MDX. These URLs
are preserved. The editor fork lives at
https://github.com/DrBushyTop/huuhkadotnet-editor.

Migration validation deliberately compares the original Ghost snapshot. Run it
when changing migration tooling; it will report intentional later article edits.
Routine CI runs the build and tests, not a requirement that posts remain identical
to the migration snapshot.

## Current resources

- Subscription: `ede0939c-80c4-4dfe-bf3d-84521f3f6d1f`
- Site: https://blue-rock-039035703.5.azurestaticapps.net
- Images: https://huuhkamediacep4lunoep3hw.blob.core.windows.net/images
- Managed identity: `huuhkadotnet-github` in `huuhkadotnet-identity`
- Production indexing: `SITE_INDEXABLE=true` after the September 21, 2026 cutover.

## Custom domain cutover

The deployment leaves Ghost and DNS untouched. The domain bindings are described
in `domains.bicep`; apply it separately once the DNS records exist:

```sh
az deployment group create -g huuhkadotnet-prod --name domains --template-file deployment/domains.bicep
```

The current apex A record target is `51.124.91.155`, the app's `stableInboundIP`.
The `www` and `blog` CNAME targets are `blue-rock-039035703.5.azurestaticapps.net`.
The apex also needs Azure's generated TXT ownership token. Keep unrelated TXT
records intact. Canonical URLs remain
`https://www.huuhka.net`. Indexing remains blocked until cutover.

1. Add `www.huuhka.net` in the Static Web App's **Custom domains** page. Use TXT
   validation if you want to validate ownership before changing the traffic CNAME.
   Complete the DNS records Azure provides and wait for certificate provisioning.
2. Point the `www` CNAME to `blue-rock-039035703.5.azurestaticapps.net`. For the apex
   domain, add a separate custom-domain binding and follow Azure's apex DNS
   instructions, or keep your existing apex-to-www redirect.
3. Check HTTPS, an article, images, `/rss/`, `/sitemap.xml`, and an old `/amp/` URL
   through the custom domain.
4. Enable indexing and dispatch a fresh build:

```sh
gh variable set SITE_INDEXABLE --repo DrBushyTop/huuhkadotnet --env production --body true
gh workflow run blog.yml --repo DrBushyTop/huuhkadotnet --ref master
```

The deployment then removes the robots meta tag and `X-Robots-Tag` response header,
and writes an allowing `robots.txt`. Local builds keep their noindex defaults.
Keep Ghost available until you have checked the new site after the DNS change.

## Manual deployment

With Azure CLI signed in to an identity with both roles listed above:

```sh
npm ci
npm run build
npm test
bash deployment/deploy.sh
```

Set `SITE_INDEXABLE=true` only after domain cutover. Rerun a previous successful
GitHub Actions run to roll back the site. Image uploads are additive; previous
images remain available, but overwriting the same blob path is not versioned.

## Analytics and comments

GA4 and giscus are configured in source, not deployment secrets. They activate
only on the public HTTPS domains listed in `src/lib/site-integrations.ts`.
The Azure default hostname remains a safe preview without third-party collection.
Analytics also requires reader consent; giscus requires Show comments.

Before publishing the comment integration, install the giscus GitHub App on
`DrBushyTop/huuhkadotnet` and include the root `giscus.json` in the default branch.
See `docs/analytics-and-comments.md` for setup checks and the remaining live tests.

References: [Static Web Apps configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration),
[managed identity with GitHub OIDC](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-identity).
