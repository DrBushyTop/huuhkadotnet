targetScope = 'resourceGroup'

param location string = resourceGroup().location
param siteName string = 'huuhkadotnet-prod'
param storageName string = 'huuhkamedia${uniqueString(resourceGroup().id)}'
@allowed(['Free', 'Standard'])
param siteSku string = 'Standard'

resource site 'Microsoft.Web/staticSites@2024-11-01' = {
  name: siteName
  location: location
  sku: {
    name: siteSku
    tier: siteSku
  }
  properties: {
    provider: 'Custom'
    allowConfigFileUpdates: true
  }
}

resource media 'Microsoft.Storage/storageAccounts@2025-01-01' = {
  name: storageName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: true
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2025-01-01' = {
  parent: media
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 7 }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
  }
}

resource images 'Microsoft.Storage/storageAccounts/blobServices/containers@2025-01-01' = {
  parent: blobs
  name: 'images'
  properties: {
    // Anyone can read an image URL. Anonymous container listing is disabled.
    publicAccess: 'Blob'
  }
}

output siteName string = site.name
output siteUrl string = 'https://${site.properties.defaultHostname}'
output storageName string = media.name
output imagesContainer string = images.name
output mediaBaseUrl string = '${media.properties.primaryEndpoints.blob}${images.name}'
