import type { Endpoint } from 'payload'
import { stripe } from '@/utils/stripe'

const stripeCheckout: Endpoint = {
  path: '/stripe/checkout',
  method: 'post',

  handler: async (req) => {
    try {
      if (!req.json) {
        return Response.json(
          { error: 'Request parser unavailable' },
          { status: 500 },
        )
      }

      const body = await req.json()

      const { courseId } = body as {
        courseId?: string
      }

      if (!courseId) {
        return Response.json(
          { error: 'Missing course id' },
          { status: 400 },
        )
      }

      const user = req.user

      if (!user || user.collection !== 'customers') {
        return Response.json(
          { error: 'Unauthorized' },
          { status: 401 },
        )
      }

      const course = await req.payload.findByID({
        collection: 'courses',
        id: courseId,
        depth: 1,
        user,
      })

      if (!course) {
        return Response.json(
          { error: 'Course not found' },
          { status: 404 },
        )
      }

      if (
        typeof course.price !== 'number' ||
        Number.isNaN(course.price) ||
        course.price <= 0
      ) {
        return Response.json(
          { error: 'Invalid course price' },
          { status: 400 },
        )
      }

      // Cek apakah sudah punya akses
      const existingParticipation =
        await req.payload.find({
          collection: 'participation',
          where: {
            and: [
              {
                customer: {
                  equals: user.id,
                },
              },
              {
                course: {
                  equals: course.id,
                },
              },
            ],
          },
          limit: 1,
          user,
        })

      if (existingParticipation.docs.length > 0) {
        return Response.json(
          { error: 'You already own this course' },
          { status: 400 },
        )
      }

      const origin =
        req.headers.get('origin') ||
        process.env.NEXT_PUBLIC_SERVER_URL

      const amount = Math.round(course.price * 100)

      const session =
        await stripe.checkout.sessions.create({
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

          // TANPA session_id
          success_url: `${origin}/dashboard/course/${course.id}/buy`,

          cancel_url: `${origin}/dashboard/course/${course.id}/buy`,
        })

      return Response.json({
        url: session.url,
      })
    } catch (error) {
      console.error(error)

      return Response.json(
        { error: 'Failed to create checkout session' },
        { status: 500 },
      )
    }
  },
}

export default stripeCheckout