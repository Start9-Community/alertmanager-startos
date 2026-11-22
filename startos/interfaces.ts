import { credentialsJson } from './fileModels/credentials.json'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  adminUsername,
  proxyRealm,
  serviceUsername,
  uiHostId,
  uiPort,
} from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)
  const apiKey = await credentialsJson.read((c) => c.apiKey).const(effects)

  const credentials = [
    ...(adminPassword
      ? [{ username: adminUsername, password: adminPassword }]
      : []),
    ...(apiKey ? [{ username: serviceUsername, password: apiKey }] : []),
  ]

  const uiMulti = sdk.MultiHost.of(effects, uiHostId)
  const uiOrigin = await uiMulti.bindPort(uiPort, {
    protocol: 'http',
    proxy: { auth: { type: 'basic', credentials, realm: proxyRealm } },
  })

  const preferredLauncherAddress = await primaryUrl.bestUsable(effects).const()

  const ui = sdk.createInterface(effects, {
    name: i18n('Web UI'),
    id: 'ui',
    description: i18n(
      'View, silence and inhibit alerts. Also the API that Prometheus and other clients send alerts to.',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
    preferredLauncherAddress,
  })

  return [await uiOrigin.export([ui])]
})
