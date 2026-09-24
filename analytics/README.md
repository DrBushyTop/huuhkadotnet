# Private traffic archive

This application archives Umami Cloud Hobby exports and publishes a private,
static traffic report. It has its own Azure Storage account, Container Apps job,
managed identity, and Free Static Web App in `huuhkadotnet-prod`. It does not use
the public blog's Static Web App or media storage. Its image lives in the
existing shared `huuhka` Azure Container Registry, so the metrics stack adds
no registry subscription cost.

## How it runs

The Container Apps job wakes every six hours. On the second day of a new month,
it signs in to Umami with Playwright and requests a `Last 6 months` export for
`huuhkadotnet`. Later runs check the Resend inbound mailbox. Umami currently
sends a signed ZIP link from `support@umami.is`; the link observed on September
24, 2026 expires after three days. The ZIP contains `website_event.csv`,
`event_data.csv`, and `session_data.csv`.

The job saves the original ZIP in a private blob container, keyed by SHA-256.
It combines archived exports by `event_id`, so six-month overlap cannot inflate
counts. The report counts page views from events of type `1`, visitors from
unique `session_id` values, and visits from unique `visit_id` values. Referrers
count the first page view of each visit. The static app receives aggregate JSON
only. Raw IDs and CSV files stay in private Blob Storage.

The viewer's `staticwebapp.config.json` requires an invited `owner` role for
every route, including `report.json`. A sign-in alone does not grant that role.
The job obtains the viewer's deployment token through Azure Resource Manager
using its managed identity. No deployment token is kept in the repository or
Key Vault.

## Local checks

```sh
cd analytics
npm ci
npm test
npm run build:viewer -- --export ../.deployment/umami-export.zip
```

The last command requires a real export at that ignored path. The generated
`analytics/.output/` directory is also ignored by Git. Do not commit exports,
reports, browser state, or mailbox content.

## Provisioning

The vault `huuhkadotnet-metrics` already has `umami-email`, `umami-password`,
and `resend-api-key`. The Resend key needs Full access to read inbound mail. The
job uses versionless Key Vault references, so password rotation does not require
a code change. The vault must allow the job identity to read secrets through
Azure RBAC. The Bicep template grants that role, Blob Data Contributor on its
own storage account, and Contributor on its own viewer for deployment.

1. Build the image in the shared registry with `az acr build -r huuhka -t
   huuhkadotnet-analytics:<commit> -f analytics/Dockerfile analytics`. Use the
   resulting immutable digest for `image`. The job identity gets `AcrPull` on
   that registry through `acr-pull.bicep`.
2. Apply `analytics/deployment/main.bicep` to `huuhkadotnet-prod`, supplying
   `image` and `alertEmail`. The deploying identity needs permission to create
   role assignments in both `huuhkadotnet-prod` and `containerregistry`.
   Azure RBAC can take a few minutes to propagate; rerun the deployment if the
   first Container Apps job creation reaches Key Vault or ACR early.
3. In the new Static Web App's **Role Management**, invite the intended Microsoft
   Entra account to the `owner` role. Accept the invitation through the same
   domain used to view the report.
4. Start the Container Apps job manually to request the first export. It will
   poll for the email at the next scheduled run. If the September 24 link is
   still valid, `az containerapp job start -g huuhkadotnet-prod -n
   huuhkadotnet-metrics-export --args src/run.mjs --bootstrap` can import a
   recent export email within the last 72 hours without another Umami request.
5. Check the new app as the owner, then use a signed-out browser and a different
   account to confirm that neither `/` nor `/report.json` reveals data. The
   report should show the same page-view total as the source export. Check the
   job execution history and the failure alert address.

The job sends at most one failure email per UTC day using Resend's idempotency
key, from the verified `mail.huuhka.net` domain. Set `alertEmail` to a mailbox
you monitor. A failed publication leaves the previous report in place.

## Recovery and limits

- The monthly request and email handoff are recorded in `state.json` in the
  private blob container. If no email arrives for 48 hours, the job marks the
  attempt failed and requests again on its next run.
- If Umami changes its login, export form, sender, ZIP contents, or download
  host, the job fails closed and sends an alert. Review the new format before
  changing the selectors or allowlist.
- ZIP archives currently have a 100 MB compressed download limit. The report
  rebuild reads all archived ZIPs into memory. Revisit this if traffic or
  retention grows enough to approach the 2 GiB job memory limit.
- The Static Web App uses invitation-based Entra access on the Free tier. It is
  private by role, but it is not network isolated. The report contains aggregate
  counts only.
- The Container Apps environment has no Log Analytics destination to avoid a
  standing ingestion bill. Azure keeps recent job execution status; detailed
  container logs are not retained centrally. Failure email is the primary
  operational signal.
