using './main.bicep'

param namePrefix = 'taxilik'
param env = 'prod'
param location = 'francecentral'
// Leave apiImage empty for the first infra-only deploy; CI sets it to
// <acr>.azurecr.io/taxilik-api:<sha> once the registry exists and the image is built.
param apiImage = ''
