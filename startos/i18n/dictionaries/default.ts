export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Alertmanager!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  // interfaces.ts
  'Web UI': 4,
  'View, silence and inhibit alerts. Also the API that Prometheus and other clients send alerts to.': 5,
  // init/initializeService.ts
  'Create a password to log in to the Alertmanager web interface': 6,
  // actions/setAdminPassword.ts
  'Set Admin Password': 7,
  'Generate a new random password for the Alertmanager web interface. The username is always "admin".': 8,
  'Replaces the current admin password.': 9,
  'Admin Credentials': 10,
  'Use these credentials to log in to the Alertmanager web interface.': 11,
  Username: 12,
  Password: 13,
  // actions/editConfig.ts
  Configuration: 14,
  'Routes, receivers, inhibition rules and templates, in Alertmanager YAML. SMTP settings come from the Email Alerts action.': 15,
  'Edit Configuration': 16,
  'Edit the Alertmanager configuration that decides where notifications go. Checked with amtool before it is saved.': 17,
  'The configuration is not valid YAML: ${error}': 18,
  'amtool rejected the configuration: ${error}': 19,
  // actions/emailAlerts.ts
  Recipient: 20,
  'The address alerts are sent to. Required unless SMTP is disabled.': 21,
  'Email Alerts': 22,
  'Send alerts by email through the StartOS SMTP server or your own. Adds the recipient to the "${receiver}" receiver.': 23,
  'Enter a recipient to send alerts by email.': 24,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
