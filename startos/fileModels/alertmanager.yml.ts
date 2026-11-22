import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/** The user's Alertmanager configuration, kept verbatim with its comments. */
export const alertmanagerYml = FileHelper.string({
  base: sdk.volumes.main,
  subpath: 'config/alertmanager.yml',
})
