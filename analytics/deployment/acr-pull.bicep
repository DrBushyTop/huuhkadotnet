targetScope = 'resourceGroup'

param registryName string
param identityId string
param principalId string
@description('AcrPull for the job; AcrPush for the GitHub deploy identity.')
@allowed(['AcrPull', 'AcrPush'])
param role string = 'AcrPull'

var roles = {
  AcrPull: '7f951dda-4ed3-4680-a7ca-43fe172d538d'
  AcrPush: '8311e382-0749-4cb8-b61a-304f252e45ec'
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: registryName
}

resource assignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  // The AcrPull name keeps the original assignment's ID stable.
  name: role == 'AcrPull' ? guid(registry.id, identityId, 'AcrPull') : guid(registry.id, identityId, role)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', roles[role])
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
