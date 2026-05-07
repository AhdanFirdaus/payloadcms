import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { finalizeCheckoutSession, stripe } from '@/utils/stripe'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const body = await req.text()

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      await finalizeCheckoutSession({
        payload,
        sessionId: session.id,
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
  }
}
