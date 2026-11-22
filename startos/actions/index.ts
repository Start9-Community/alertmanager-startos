import { primaryUrl } from '../primaryUrl'
import { sdk } from '../sdk'
import { editConfig } from './editConfig'
import { emailAlerts } from './emailAlerts'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(editConfig)
  .addAction(emailAlerts)
  .addAction(primaryUrl.action)
