targetScope = 'resourceGroup'

@description('Immutable image in the existing shared Azure Container Registry.')
param image string
param location string = resourceGroup().location
param keyVaultName string = 'huuhkadotnet-metrics'
param registryName string = 'huuhka'
param registryResourceGroup string = 'containerregistry'
param storageName string = 'huuhkamet${uniqueString(resourceGroup().id)}'
param siteName string = 'huuhkadotnet-metrics'
@description('Address that receives a short email when the scheduled export job fails.')
param alertEmail string
@description('Entra object ID of the viewer owner. Gets read access to the reports container.')
param viewerPrincipalId string
@description('Resource ID of the GitHub Actions identity that deploys the viewer and job image.')
param deployerIdentityId string = '/subscriptions/${subscription().subscriptionId}/resourceGroups/huuhkadotnet-identity/providers/Microsoft.ManagedIdentity/userAssignedIdentities/huuhkadotnet-github'
param customDomain string = 'metrics.huuhka.net'

resource vault 'Microsoft.KeyVault/vaults@2025-05-01' existing = {
  name: keyVaultName
}

resource storage 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: storageName
  location: location
  sku: {name: 'Standard_LRS'}
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: {enabled: true, days: 30}
    containerDeleteRetentionPolicy: {enabled: true, days: 30}
    // The viewer reads reports straight from Blob Storage with the owner's Entra token.
    cors: {
      corsRules: [
        {
          allowedOrigins: ['https://${customDomain}', 'https://${site.properties.defaultHostname}']
          allowedMethods: ['GET', 'HEAD', 'OPTIONS']
          allowedHeaders: ['authorization', 'x-ms-version', 'x-ms-client-request-id']
          exposedHeaders: ['content-length', 'content-encoding', 'etag', 'last-modified']
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource archive 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobService
  name: 'umami'
  properties: {publicAccess: 'None'}
}

// Published reports. Only the viewer owner can read; only the job writes.
resource reports 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobService
  name: 'reports'
  properties: {publicAccess: 'None'}
}

// One-time raw imports, such as the GA4 baseline export. Not readable by the viewer.
resource imports 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobService
  name: 'imports'
  properties: {publicAccess: 'None'}
}

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: siteName
  location: location
  sku: {name: 'Free', tier: 'Free'}
  properties: {provider: 'Custom', allowConfigFileUpdates: true}
}

resource domain 'Microsoft.Web/staticSites/customDomains@2024-11-01' = {
  parent: site
  name: customDomain
  properties: {validationMethod: 'cname-delegation'}
}

resource reportsReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(reports.id, viewerPrincipalId, 'Storage Blob Data Reader')
  scope: reports
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1')
    principalId: viewerPrincipalId
    principalType: 'User'
  }
}

resource deployer 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: last(split(deployerIdentityId, '/'))
  scope: resourceGroup(split(deployerIdentityId, '/')[2], split(deployerIdentityId, '/')[4])
}

module acrPush './acr-pull.bicep' = {
  name: 'huuhkadotnet-metrics-acr-push'
  scope: resourceGroup(registryResourceGroup)
  params: {
    registryName: registryName
    identityId: deployer.id
    principalId: deployer.properties.principalId
    role: 'AcrPush'
  }
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'huuhkadotnet-metrics-job'
  location: location
}

module acrPull './acr-pull.bicep' = {
  name: 'huuhkadotnet-metrics-acr-pull'
  scope: resourceGroup(registryResourceGroup)
  params: {
    registryName: registryName
    identityId: identity.id
    principalId: identity.properties.principalId
  }
}

resource vaultReader 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(vault.id, identity.id, 'Key Vault Secrets User')
  scope: vault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource blobWriter 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, 'Storage Blob Data Contributor')
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: 'huuhkadotnet-metrics-env'
  location: location
  properties: {}
}

resource job 'Microsoft.App/jobs@2025-01-01' = {
  name: 'huuhkadotnet-metrics-export'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {'${identity.id}': {}}
  }
  properties: {
    environmentId: environment.id
    configuration: {
      triggerType: 'Schedule'
      registries: [
        {server: '${registryName}.azurecr.io', identity: identity.id}
      ]
      scheduleTriggerConfig: {
        cronExpression: '0 */6 * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      replicaTimeout: 1800
      replicaRetryLimit: 1
      secrets: [
        {name: 'umami-email', keyVaultUrl: '${vault.properties.vaultUri}secrets/umami-email', identity: identity.id}
        {name: 'umami-password', keyVaultUrl: '${vault.properties.vaultUri}secrets/umami-password', identity: identity.id}
        {name: 'resend-api-key', keyVaultUrl: '${vault.properties.vaultUri}secrets/resend-api-key', identity: identity.id}
      ]
    }
    template: {
      containers: [
        {
          name: 'exporter'
          image: image
          command: ['node']
          args: ['src/run.mjs']
          resources: {cpu: 1, memory: '2Gi'}
          env: [
            {name: 'AZURE_CLIENT_ID', value: identity.properties.clientId}
            {name: 'AZURE_STORAGE_ACCOUNT', value: storage.name}
            {name: 'ALERT_EMAIL', value: alertEmail}
            {name: 'UMAMI_EMAIL', secretRef: 'umami-email'}
            {name: 'UMAMI_PASSWORD', secretRef: 'umami-password'}
            {name: 'RESEND_API_KEY', secretRef: 'resend-api-key'}
          ]
        }
      ]
    }
  }
  dependsOn: [vaultReader, blobWriter, acrPull]
}

output storageName string = storage.name
output siteUrl string = 'https://${customDomain}'
output reportsUrl string = '${storage.properties.primaryEndpoints.blob}reports'
output siteResourceId string = site.id
output jobName string = job.name
