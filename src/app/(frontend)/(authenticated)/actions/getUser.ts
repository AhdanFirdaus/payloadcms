'user server'

import { headers as getHeders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { Payload } from 'payload'
import { Customer } from '@/payload-types'

export async function getUser(): Promise<Customer | null> {
  const headers = await getHeders()
  const payload: Payload = await getPayload({ config: await configPromise })
  const { user } = await payload.auth({ headers })

  // Cek apakah user ada dan berasal dari koleksi customers
  if (user && user.collection === 'customers') {
    return user as Customer
  }

  return null
}
