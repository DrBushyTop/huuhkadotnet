targetScope = 'resourceGroup'

param location string = 'westeurope'
param namePrefix string = 'huuhkadotnet'

// Supply contacts privately at deployment time, never in a committed parameter file.
@secure()
param alertEmail string
@secure()
param smsCountryCode string
@secure()
param smsPhoneNumber string

var testName = '${namePrefix}-www-availability'

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-availability-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}

// Server-side synthetic checks only. No Application Insights browser tracker.
resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${namePrefix}-availability'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    IngestionMode: 'LogAnalytics'
    DisableLocalAuth: true
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource notifications 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${namePrefix}-availability-notifications'
  location: 'global'
  properties: {
    groupShortName: 'huuhka-up'
    enabled: true
    emailReceivers: [
      {
        name: 'owner-email'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: [
      {
        name: 'owner-sms'
        countryCode: smsCountryCode
        phoneNumber: smsPhoneNumber
      }
    ]
  }
}

resource availability 'Microsoft.Insights/webtests@2022-06-15' = {
  name: testName
  location: location
  kind: 'standard'
  tags: {
    'hidden-link:${insights.id}': 'Resource'
  }
  properties: {
    Name: testName
    SyntheticMonitorId: testName
    Description: 'Check https://www.huuhka.net/ returns HTTP 200 every five minutes from five locations.'
    Enabled: true
    Kind: 'standard'
    Frequency: 300
    Timeout: 30
    RetryEnabled: true
    Locations: [
      { Id: 'emea-nl-ams-azr' } // West Europe
      { Id: 'emea-gb-db3-azr' } // North Europe
      { Id: 'emea-fr-pra-edge' } // France Central
      { Id: 'us-va-ash-azr' } // East US
      { Id: 'apac-sg-sin-azr' } // Southeast Asia
    ]
    Request: {
      RequestUrl: 'https://www.huuhka.net/'
      HttpVerb: 'GET'
      FollowRedirects: false
      ParseDependentRequests: false
    }
    ValidationRules: {
      ExpectedHttpStatusCode: 200
      IgnoreHttpStatusCode: false
      SSLCheck: true
      SSLCertRemainingLifetimeCheck: 1
    }
  }
}

resource outage 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-www-unavailable'
  location: 'global'
  properties: {
    description: 'www.huuhka.net is unavailable from at least three of five locations. Expected HTTP 200 within 30 seconds with valid TLS.'
    severity: 1
    enabled: true
    scopes: [availability.id, insights.id]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    autoMitigate: true
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria'
      webTestId: availability.id
      componentId: insights.id
      failedLocationCount: 3
    }
    actions: [
      { actionGroupId: notifications.id }
    ]
  }
}

output workspaceId string = workspace.properties.customerId
output insightsId string = insights.id
output webTestId string = availability.id
output alertId string = outage.id
output actionGroupId string = notifications.id
