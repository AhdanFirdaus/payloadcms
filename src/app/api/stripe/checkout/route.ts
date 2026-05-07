import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { stripe } from '@/utils/stripe'

type CheckoutBody = {
  courseId?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutBody

    if (!body.courseId) {
      return NextResponse.json({ error: 'Missing course id' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    const auth = await payload.auth({ headers: req.headers })
    const user = auth.user

    if (!user || user.collection !== 'customers') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await payload.findByID({
      collection: 'courses',
      id: body.courseId,
      depth: 1,
      overrideAccess: false,
      user,
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (typeof course.price !== 'number' || Number.isNaN(course.price) || course.price <= 0) {
      return NextResponse.json(
        { error: 'Course price is missing. Set a Price (USD) value in the admin first.' },
        { status: 400 },
      )
    }

    const origin = req.headers.get('origin') ?? req.nextUrl.origin
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

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
