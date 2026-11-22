import { SmtpSelection, T, utils, YAML } from '@start9labs/start-sdk'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const uiPort = 9093

export const uiHostId = 'ui'

export const adminUsername = 'admin'

/** The username dependent services present with the key from `credentials.json`. */
export const serviceUsername = 'service'

export const proxyRealm = 'Alertmanager'

export const configPath = '/etc/alertmanager/alertmanager.yml'

export const caBundlePath = '/etc/alertmanager/ca-bundle.crt'

/** The receiver that Email Alerts adds an email notification to. */
export const emailReceiver = 'default'

export const defaultConfig = `# Alertmanager configuration.
# Reference: https://prometheus.io/docs/alerting/latest/configuration/
route:
  receiver: ${emailReceiver}
  group_by: [alertname]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
receivers:
  - name: ${emailReceiver}
`

export const generatePassword = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 })

/**
 * Overlays the package-managed SMTP settings and email receiver onto the
 * user's configuration. Throws on YAML that is not a mapping.
 */
export function effectiveConfig(
  userConfig: string,
  smtp: T.SmtpValue | null,
  emailTo: string | null,
): string {
  const config = YAML.parse(userConfig) ?? {}
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('The configuration must be a YAML mapping')
  }
  if (smtp) {
    const global = { ...(config.global ?? {}) }
    global.smtp_smarthost = `${smtp.host}:${smtp.port}`
    global.smtp_from = smtp.from
    global.smtp_require_tls = true
    global.smtp_force_implicit_tls = smtp.security === 'tls'
    if (smtp.username) global.smtp_auth_username = smtp.username
    if (smtp.password) global.smtp_auth_password = smtp.password
    config.global = global

    if (emailTo) {
      const receivers: any[] = Array.isArray(config.receivers)
        ? [...config.receivers]
        : []
      const index = receivers.findIndex((r) => r?.name === emailReceiver)
      const receiver =
        index === -1 ? { name: emailReceiver } : { ...receivers[index] }
      receiver.email_configs = [
        ...(Array.isArray(receiver.email_configs)
          ? receiver.email_configs
          : []),
        { to: emailTo, send_resolved: true },
      ]
      if (index === -1) receivers.push(receiver)
      else receivers[index] = receiver
      config.receivers = receivers
    }
  }
  return YAML.stringify(config)
}

/** Null while email is disabled, or set to system SMTP that StartOS lacks. */
export function smtpValue(
  selection: SmtpSelection,
  system: T.SmtpValue | null,
): T.SmtpValue | null {
  switch (selection.selection) {
    case 'system':
      return system
        ? { ...system, from: selection.value.customFrom || system.from }
        : null
    case 'custom': {
      const provider = selection.value.provider.value
      return {
        host: provider.host,
        port: Number(provider.security.value.port),
        from: provider.from,
        username: provider.username,
        password: provider.password,
        security: provider.security.selection,
      }
    }
    default:
      return null
  }
}

/** Throws a user-facing error unless amtool accepts the effective configuration. */
export async function checkConfig(
  effects: T.Effects,
  userConfig: string,
  smtp: T.SmtpValue | null,
  emailTo: string | null,
): Promise<void> {
  let config: string
  try {
    config = effectiveConfig(userConfig, smtp, emailTo)
  } catch (e) {
    throw new Error(
      i18n('The configuration is not valid YAML: ${error}', {
        error: String(e),
      }),
    )
  }

  const check = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'alertmanager' },
    null,
    'check-config',
    async (sub) => {
      await sub.writeFile('/tmp/alertmanager.yml', config)
      return sub.exec(['amtool', 'check-config', '/tmp/alertmanager.yml'])
    },
  )
  if (check.exitCode !== 0) {
    throw new Error(
      i18n('amtool rejected the configuration: ${error}', {
        error: (String(check.stdout) + String(check.stderr)).trim(),
      }),
    )
  }
}
