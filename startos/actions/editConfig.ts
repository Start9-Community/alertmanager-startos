import { alertmanagerYml } from '../fileModels/alertmanager.yml'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { checkConfig, smtpValue } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  config: Value.textarea({
    name: i18n('Configuration'),
    description: i18n(
      'Routes, receivers, inhibition rules and templates, in Alertmanager YAML. SMTP settings come from the Email Alerts action.',
    ),
    required: true,
    default: null,
    minRows: 12,
    maxRows: 30,
  }),
})

export const editConfig = sdk.Action.withInput(
  // id
  'edit-config',

  // metadata
  async ({ effects }) => ({
    name: i18n('Edit Configuration'),
    description: i18n(
      'Edit the Alertmanager configuration that decides where notifications go. Checked with amtool before it is saved.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => ({
    config: (await alertmanagerYml.read().once()) ?? undefined,
  }),

  // the execution function
  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    const system =
      store?.smtp.selection === 'system'
        ? await sdk.getSystemSmtp(effects).once()
        : null
    const smtp = store ? smtpValue(store.smtp, system) : null

    await checkConfig(effects, input.config, smtp, store?.emailTo ?? null)

    await alertmanagerYml.write(effects, input.config)
  },
)
