import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'alertmanager',
  title: 'Alertmanager',
  license: 'Apache-2.0',
  packageRepo: 'https://github.com/Start9-Community/alertmanager-startos',
  upstreamRepo: 'https://github.com/prometheus/alertmanager',
  marketingUrl: 'https://prometheus.io/docs/alerting/latest/alertmanager/',
  donationUrl: null,
  description: { short, long },
  volumes: ['main', 'startos', 'public'],
  images: {
    alertmanager: {
      source: { dockerTag: 'prom/alertmanager:v0.35.0' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
