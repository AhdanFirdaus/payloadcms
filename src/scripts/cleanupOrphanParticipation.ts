import 'dotenv/config'

import { getPayload } from 'payload'
import config from '@/payload.config'

async function cleanup() {
  const payload = await getPayload({
    config,
  })

  const participations = await payload.find({
    collection: 'participation',

    limit: 1000,

    overrideAccess: true,
  })

  for (const participation of participations.docs) {
    const customerId =
      typeof participation.customer === 'string'
        ? participation.customer
        : participation.customer?.id

    if (!customerId) {
      continue
    }

    try {
      await payload.findByID({
        collection: 'customers',

        id: customerId,

        overrideAccess: true,
      })
    } catch {
      console.log(
        `Deleting orphan participation: ${participation.id}`,
      )

      await payload.delete({
        collection: 'participation',

        id: participation.id,

        overrideAccess: true,
      })
    }
  }

  console.log('Cleanup complete')
}

cleanup()