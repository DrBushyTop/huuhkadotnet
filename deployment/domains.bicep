targetScope = 'resourceGroup'

param siteName string = 'huuhkadotnet-prod'

resource site 'Microsoft.Web/staticSites@2024-11-01' existing = {
  name: siteName
}

resource subdomains 'Microsoft.Web/staticSites/customDomains@2024-11-01' = [for domain in ['www.huuhka.net', 'blog.huuhka.net']: {
  parent: site
  name: domain
  properties: {
    validationMethod: 'cname-delegation'
  }
}]

resource apex 'Microsoft.Web/staticSites/customDomains@2024-11-01' = {
  parent: site
  name: 'huuhka.net'
  properties: {
    validationMethod: 'dns-txt-token'
  }
}
