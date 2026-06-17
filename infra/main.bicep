// TaxiLik.ma — core infrastructure (Bicep).
// Provisions: Log Analytics + App Insights, ACR, Key Vault, Redis, Storage,
// Container Apps environment + the API container app (managed identity, WS
// ingress, autoscale). Cosmos DB for MongoDB vCore and Front Door + WAF are
// documented as follow-on modules (see comments at the bottom).
//
// Deploy:
//   az group create -n rg-taxilik-prod -l francecentral
//   az deployment group create -g rg-taxilik-prod -f infra/main.bicep \
//       -p infra/main.prod.bicepparam

@description('Short prefix for resource names, e.g. taxilik')
param namePrefix string = 'taxilik'

@description('Environment: dev | staging | prod')
@allowed(['dev', 'staging', 'prod'])
param env string = 'prod'

param location string = resourceGroup().location

@description('Container image to run (set by CI to <acr>.azurecr.io/taxilik-api:<sha>)')
param apiImage string = ''

var suffix = '${namePrefix}-${env}'
var tags = { app: 'taxilik', env: env }

// ---------------- Observability ----------------
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${suffix}'
  location: location
  tags: tags
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${suffix}'
  location: location
  kind: 'web'
  tags: tags
  properties: { Application_Type: 'web', WorkspaceResourceId: logs.id }
}

// ---------------- Container Registry ----------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: replace('acr${suffix}', '-', '')
  location: location
  tags: tags
  sku: { name: 'Standard' }
  properties: { adminUserEnabled: false }
}

// ---------------- Key Vault (RBAC) ----------------
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-${suffix}'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled' // reach via private endpoint
  }
}

// ---------------- Redis (Socket.IO adapter, rate limits, sessions) ----------------
resource redis 'Microsoft.Cache/redis@2024-03-01' = {
  name: 'redis-${suffix}'
  location: location
  tags: tags
  properties: {
    sku: { name: 'Standard', family: 'C', capacity: 1 }
    minimumTlsVersion: '1.2'
    redisVersion: '6'
  }
}

// ---------------- Storage (driver docs, avatars) ----------------
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: replace('st${suffix}', '-', '')
  location: location
  tags: tags
  sku: { name: 'Standard_RAGRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blob 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource uploads 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blob
  name: 'uploads'
  properties: { publicAccess: 'None' }
}

// ---------------- Container Apps environment ----------------
resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${suffix}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
    zoneRedundant: env == 'prod'
  }
}

// ---------------- API container app ----------------
resource api 'Microsoft.App/containerApps@2024-03-01' = if (!empty(apiImage)) {
  name: 'ca-api-${suffix}'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      activeRevisionsMode: 'Multiple' // blue/green
      ingress: {
        external: true
        targetPort: 5000
        transport: 'auto'        // supports WebSocket
        allowInsecure: false
        stickySessions: { affinity: 'sticky' } // keep a socket on one replica
      }
      registries: [
        { server: '${acr.name}.azurecr.io', identity: 'system' }
      ]
      secrets: [
        // Wire these from Key Vault references in your pipeline / portal.
        { name: 'appinsights-conn', value: appi.properties.ConnectionString }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('1.0'), memory: '2Gi' }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '5000' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', secretRef: 'appinsights-conn' }
            // MONGO_URI, JWT_SECRET, REDIS_URL, SMTP_*, STORAGE_* -> Key Vault refs
          ]
          probes: [
            { type: 'Liveness', httpGet: { path: '/health', port: 5000 }, periodSeconds: 20 }
            { type: 'Readiness', httpGet: { path: '/health', port: 5000 }, periodSeconds: 10 }
          ]
        }
      ]
      scale: {
        minReplicas: env == 'prod' ? 2 : 1
        maxReplicas: 30
        rules: [
          { name: 'http', http: { metadata: { concurrentRequests: '80' } } }
        ]
      }
    }
  }
}

// ---------------- Role assignments (managed identity, least privilege) ----------------
var acrPullRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
var kvSecretsUser = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var blobContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(apiImage)) {
  name: guid(acr.id, api.id, 'acrpull')
  scope: acr
  properties: { roleDefinitionId: acrPullRole, principalId: api.identity.principalId, principalType: 'ServicePrincipal' }
}

resource kvAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(apiImage)) {
  name: guid(kv.id, api.id, 'kvsecrets')
  scope: kv
  properties: { roleDefinitionId: kvSecretsUser, principalId: api.identity.principalId, principalType: 'ServicePrincipal' }
}

resource blobAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(apiImage)) {
  name: guid(storage.id, api.id, 'blob')
  scope: storage
  properties: { roleDefinitionId: blobContributor, principalId: api.identity.principalId, principalType: 'ServicePrincipal' }
}

output acrLoginServer string = '${acr.name}.azurecr.io'
output apiFqdn string = !empty(apiImage) ? api.properties.configuration.ingress.fqdn : ''
output keyVaultName string = kv.name

// ---------------- Follow-on modules (add as separate .bicep) ----------------
// 1) Cosmos DB for MongoDB vCore  (Microsoft.DocumentDB/mongoClusters) — geo 2dsphere,
//    PITR, private endpoint. Store the connection string in Key Vault.
// 2) Azure Front Door Premium + WAF policy (OWASP CRS, rate-limit, geo, bot) in front
//    of the container app FQDN; DDoS Protection Standard on the VNet.
// 3) Private endpoints + VNet integration for Cosmos / Redis / Key Vault / Storage.
// 4) Azure Communication Services (Email) for OTP.
