targetScope = 'resourceGroup'

@description('Immutable public container image built from analytics/Dockerfile.')
param image string
param location string = resourceGroup().location
param keyVaultName string = 'huuhkadotnet-metrics'
param storageName string = 'huuhkamet${uniqueString(resourceGroup().id)}'
param siteName string = 'huuhkadotnet-metrics'
@description('Address that receives a short email when the scheduled export job fails.')
param alertEmail string

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
  }
}

resource archive 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobService
  name: 'umami'
  properties: {publicAccess: 'None'}
}

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: siteName
  location: location
  sku: {name: 'Free', tier: 'Free'}
  properties: {provider: 'Custom', allowConfigFileUpdates: true}
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'huuhkadotnet-metrics-job'
  location: location
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

resource siteDeployer 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(site.id, identity.id, 'Contributor')
  scope: site
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
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
            {name: 'AZURE_STATIC_SITE_RESOURCE_ID', value: site.id}
            {name: 'ALERT_EMAIL', value: alertEmail}
            {name: 'UMAMI_EMAIL', secretRef: 'umami-email'}
            {name: 'UMAMI_PASSWORD', secretRef: 'umami-password'}
            {name: 'RESEND_API_KEY', secretRef: 'resend-api-key'}
          ]
        }
      ]
    }
  }
  dependsOn: [vaultReader, blobWriter, siteDeployer]
}

output storageName string = storage.name
output siteUrl string = 'https://${site.properties.defaultHostname}'
output siteResourceId string = site.id
output jobName string = job.name
