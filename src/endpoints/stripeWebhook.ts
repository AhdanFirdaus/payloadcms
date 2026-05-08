import type { Endpoint } from 'payload'

import { finalizeCheckoutSession, stripe } from '@/utils/stripe'

const stripeWebhook: Endpoint = {
  path: '/stripe/webhook',
  method: 'post',

  handler: async (req) => {
    const signature = req.headers.get('stripe-signature')

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!signature || !webhookSecret) {
      return Response.json(
        {
          error: 'Missing webhook signature or secret',
        },
        { status: 400 },
      )
    }

    const body = await req.text?.()

    if (!body) {
      return Response.json({ error: 'Missing body' }, { status: 400 })
    }

    try {
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object

        await finalizeCheckoutSession({
          payload: req.payload,
          sessionId: session.id,
        })
      }

      return Response.json({
        received: true,
      })
    } catch (error) {
      console.error('Stripe webhook error:', error)

      return Response.json({ error: 'Invalid webhook' }, { status: 400 })
    }
  },
}

export default stripeWebhook
