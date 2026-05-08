import type { Endpoint } from 'payload'

import { stripe } from '@/utils/stripe'

const stripeWebhook: Endpoint = {
  path: '/stripe/webhook',
  method: 'post',

  handler: async (req) => {
    try {
      const signature =
        req.headers.get('stripe-signature')

      const webhookSecret =
        process.env.STRIPE_WEBHOOK_SECRET

      if (!signature || !webhookSecret) {
        return Response.json(
          {
            error:
              'Missing webhook signature or secret',
          },
          { status: 400 },
        )
      }

      if (!req.text) {
        return Response.json(
          {
            error:
              'Request text parser unavailable',
          },
          { status: 500 },
        )
      }

      const body = await req.text()

      const event =
        stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret,
        )

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object

          const courseId =
            session.metadata?.courseId

          const customerId =
            session.metadata?.customerId

          if (!courseId || !customerId) {
            throw new Error(
              'Missing metadata values',
            )
          }

          // Idempotency check
          const existingParticipation =
            await req.payload.find({
              collection: 'participation',
              where: {
                stripeSessionID: {
                  equals: session.id,
                },
              },
              limit: 1,
              overrideAccess: true,
            })

          if (
            existingParticipation.docs.length > 0
          ) {
            return Response.json({
              received: true,
            })
          }

          // Validasi course benar ada
          const course =
            await req.payload.findByID({
              collection: 'courses',
              id: courseId,
              overrideAccess: true,
            })

          if (!course) {
            throw new Error('Course not found')
          }

          // Validasi customer benar ada
          const customer =
            await req.payload.findByID({
              collection: 'customers',
              id: customerId,
              overrideAccess: true,
            })

          if (!customer) {
            throw new Error('Customer not found')
          }

          // Create participation
          await req.payload.create({
            collection: 'participation',

            overrideAccess: true,

            data: {
              customer: customer.id,
              course: course.id,

              paymentStatus: 'paid',

              stripeSessionID: session.id,

              stripePaymentIntentID:
                typeof session.payment_intent ===
                'string'
                  ? session.payment_intent
                  : undefined,
            },
          })

          break
        }
      }

      return Response.json({
        received: true,
      })
    } catch (error) {
      console.error(
        'Stripe webhook error:',
        error,
      )

      return Response.json(
        { error: 'Invalid webhook' },
        { status: 400 },
      )
    }
  },
}

export default stripeWebhook