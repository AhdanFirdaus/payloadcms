import type { Endpoint } from 'payload'

import { stripe } from '@/utils/stripe'

const stripeCheckout: Endpoint = {
  path: '/stripe/checkout',
  method: 'post',

  handler: async (req) => {
    try {
      const body = await req.json?.()

      if (!body) {
        return Response.json({ error: 'Missing body' }, { status: 400 })
      }

      if (!body.courseId) {
        return Response.json({ error: 'Missing course id' }, { status: 400 })
      }

      const user = req.user

      if (!user || user.collection !== 'customers') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const course = await req.payload.findByID({
        collection: 'courses',
        id: body.courseId,
        depth: 1,
        user,
      })

      if (!course) {
        return Response.json({ error: 'Course not found' }, { status: 404 })
      }

      const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SERVER_URL

      const amount = Math.round(course.price * 100)

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],

        customer_email: user.email,

        client_reference_id: course.id,

        metadata: {
          courseId: course.id,
          customerId: user.id,
        },

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'usd',
              unit_amount: amount,

              product_data: {
                name: course.title,
                description: course.description,
              },
            },
          },
        ],

        success_url: `${origin}/dashboard/course/${course.id}/buy?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url: `${origin}/dashboard/course/${course.id}/buy`,
      })

      return Response.json({
        url: session.url,
      })
    } catch (error) {
      console.error(error)

      return Response.json({ error: 'Checkout failed' }, { status: 500 })
    }
  },
}

export default stripeCheckout
