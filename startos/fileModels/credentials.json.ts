import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

/**
 * On the `public` volume, which dependent services mount read-only. They pass
 * the gate as `serviceUsername` with `apiKey` as the password.
 */
const shape = z.looseObject({
  apiKey: z.string().optional().catch(undefined),
})

export const credentialsJson = FileHelper.json(
  { base: sdk.volumes.public, subpath: 'credentials.json' },
  shape,
)
