import Stripe from 'stripe'
import type { Payload } from 'payload'
import type { Participation } from '@/payload-types'

export const stripe = new Stripe(process.env.STRIPE_SK || '')

export async function ensureParticipation({
  payload,
  courseId,
  customerId,
}: {
  payload: Payload
  courseId: string
  customerId: string
}): Promise<Participation> {
  const existingParticipation = await payload.find({
    collection: 'participation',
    where: {
      course: { equals: courseId },
      customer: { equals: customerId },
    },
    limit: 1,
    overrideAccess: true,
  })

  if (existingParticipation.docs[0]) {
    return existingParticipation.docs[0] as Participation
  }

  return payload.create({
    collection: 'participation',
    data: {
      course: courseId,
      customer: customerId,
      progress: 0,
    },
    overrideAccess: true,
  }) as Promise<Participation>
}

export async function finalizeCheckoutSession({
  payload,
  sessionId,
}: {
  payload: Payload
  sessionId: string
}): Promise<Participation | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    return null
  }

  const courseId = session.metadata?.courseId
  const customerId = session.metadata?.customerId

  if (!courseId || !customerId) {
    return null
  }

  return ensureParticipation({
    payload,
    courseId,
    customerId,
  })
}
