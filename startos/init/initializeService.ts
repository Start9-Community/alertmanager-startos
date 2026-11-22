import { setAdminPassword } from '../actions/setAdminPassword'
import { alertmanagerYml } from '../fileModels/alertmanager.yml'
import { credentialsJson } from '../fileModels/credentials.json'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { defaultConfig, generatePassword } from '../utils'

export const initializeService = sdk.setupOnInit(async (effects) => {
  if ((await alertmanagerYml.read().once()) === null) {
    await alertmanagerYml.write(effects, defaultConfig)
  }

  if (!(await storeJson.read().once())) {
    await storeJson.merge(effects, {})
  }

  const apiKey = await credentialsJson.read((c) => c.apiKey).const(effects)
  if (!apiKey) {
    await credentialsJson.merge(
      effects,
      { apiKey: generatePassword() },
      { allowWriteAfterConst: true },
    )
  }

  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)
  if (!adminPassword) {
    await sdk.action.createOwnTask(effects, setAdminPassword, 'critical', {
      reason: i18n(
        'Create a password to log in to the Alertmanager web interface',
      ),
    })
  }
})
