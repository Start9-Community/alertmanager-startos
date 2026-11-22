import { smtpPrefill } from '@start9labs/start-sdk'
import { alertmanagerYml } from '../fileModels/alertmanager.yml'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { checkConfig, emailReceiver, smtpValue } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  smtp: sdk.inputSpecConstants.smtpInputSpec,
  emailTo: Value.text({
    name: i18n('Recipient'),
    description: i18n(
      'The address alerts are sent to. Required unless SMTP is disabled.',
    ),
    required: false,
    default: null,
    placeholder: 'you@example.com',
    patterns: [sdk.patterns.email],
  }),
})

export const emailAlerts = sdk.Action.withInput(
  // id
  'email-alerts',

  // metadata
  async ({ effects }) => ({
    name: i18n('Email Alerts'),
    description: i18n(
      'Send alerts by email through the StartOS SMTP server or your own. Adds the recipient to the "${receiver}" receiver.',
      { receiver: emailReceiver },
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // form input specification
  inputSpec,

  // optionally pre-fill the input form
  async ({ effects }) => {
    const store = await storeJson.read().once()
    return {
      smtp: smtpPrefill(store?.smtp),
      emailTo: store?.emailTo ?? undefined,
    }
  },

  // the execution function
  async ({ effects, input }) => {
    if (input.smtp.selection !== 'disabled' && !input.emailTo) {
      throw new Error(i18n('Enter a recipient to send alerts by email.'))
    }
    const system =
      input.smtp.selection === 'system'
        ? await sdk.getSystemSmtp(effects).once()
        : null
    await checkConfig(
      effects,
      (await alertmanagerYml.read().once()) ?? '',
      smtpValue(input.smtp, system),
      input.emailTo,
    )

    await storeJson.merge(effects, {
      smtp: input.smtp,
      emailTo: input.emailTo,
    })
  },
)
