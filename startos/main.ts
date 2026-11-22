import { readFile } from 'node:fs/promises'
import { alertmanagerYml } from './fileModels/alertmanager.yml'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './primaryUrl'
import { sdk } from './sdk'
import {
  caBundlePath,
  configPath,
  effectiveConfig,
  smtpValue,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Alertmanager!'))

  const store = await storeJson
    .read((s) => ({ smtp: s.smtp, emailTo: s.emailTo }))
    .const(effects)
  if (!store) throw new Error('No store.json')
  const userConfig = await alertmanagerYml.read().const(effects)
  if (userConfig === null) throw new Error('No alertmanager.yml')

  const system =
    store.smtp.selection === 'system'
      ? await sdk.getSystemSmtp(effects).const()
      : null
  const smtp = smtpValue(store.smtp, system)
  const externalUrl = await primaryUrl.bestUsable(effects).const()

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'alertmanager' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: 'data',
      mountpoint: '/alertmanager',
      readonly: false,
    }),
    'alertmanager-sub',
  )
  const rootfs = await subcontainer.rootfs

  await subcontainer.writeFile(
    configPath,
    effectiveConfig(userConfig, smtp, store.emailTo),
  )
  const systemBundle = await readFile(
    `${rootfs}/etc/ssl/certs/ca-certificates.crt`,
    'utf8',
  )
  await subcontainer.writeFile(
    caBundlePath,
    `${systemBundle}\n${await sdk.getRootCa(effects)}`,
  )

  return sdk.Daemons.of(effects)
    .addOneshot('chown', {
      subcontainer,
      exec: {
        command: ['chown', '-R', 'nobody:nobody', '/alertmanager'],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('alertmanager', {
      subcontainer,
      exec: {
        command: [
          'alertmanager',
          `--config.file=${configPath}`,
          '--storage.path=/alertmanager',
          `--web.listen-address=:${uiPort}`,
          ...(externalUrl ? [`--web.external-url=${externalUrl}`] : []),
          '--cluster.listen-address=',
        ],
        env: { SSL_CERT_FILE: caBundlePath },
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
      },
      requires: ['chown'],
    })
})
