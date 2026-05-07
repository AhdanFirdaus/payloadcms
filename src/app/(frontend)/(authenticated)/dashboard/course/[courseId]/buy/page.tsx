import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getUser } from '../../../../_actions/getUser'
import { Course, Media, Participation } from '@/payload-types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HiArrowLeft, HiCheckCircle, HiShieldCheck, HiSparkles } from 'react-icons/hi'
import Image from 'next/image'
import ResumeButton from '../_components/ResumeButton'
import CheckoutButton from './_components/CheckoutButton'
import { finalizeCheckoutSession } from '@/utils/stripe'

const CoursePage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ session_id?: string }>
}) => {
  const { courseId } = await params
  const { session_id: sessionId } = await searchParams

  const payload = await getPayload({ config: configPromise })
  const user = await getUser()

  let course: Course | null = null

  try {
    const res = await payload.findByID({
      collection: 'courses',
      id: courseId,
      depth: 1,
      overrideAccess: false,
      user: user,
    })
    course = res
  } catch (e) {
    console.error('Error fetching course:', e)
    return notFound()
  }

  if (!course) {
    return notFound()
  }

  let participation: Participation | null = null

  try {
    const participationRes = await payload.find({
      collection: 'participation',
      where: {
        course: { equals: courseId },
        customer: { equals: user.id },
      },
      overrideAccess: false,
      user: user,
    })
    participation = participationRes.docs[0] || null
  } catch (err) {
    console.error(err)
  }

  if (!participation && sessionId) {
    try {
      const finalizedParticipation = await finalizeCheckoutSession({
        payload,
        sessionId,
      })

      if (finalizedParticipation) {
        participation = finalizedParticipation
      }
    } catch (err) {
      console.error('Failed to sync checkout session:', err)
    }
  }

  if (!participation && sessionId) {
    try {
      const refreshedParticipation = await payload.find({
        collection: 'participation',
        where: {
          course: { equals: courseId },
          customer: { equals: user.id },
        },
        overrideAccess: false,
        user: user,
      })

      participation = refreshedParticipation.docs[0] || null
    } catch (err) {
      console.error(err)
    }
  }

  const courseImage = course.image as Media
  const coursePrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(course.price)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(180deg,#050505_0%,#0b0f11_50%,#050505_100%)] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-300 transition duration-300 ease-in-out hover:text-white"
        >
          <HiArrowLeft className="text-lg" />
          Back to Dashboard
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr] lg:items-start">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={courseImage.url}
                alt={`${course.title} thumbnail`}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-black/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-teal-300 backdrop-blur">
                  <HiSparkles className="text-sm" />
                  Premium course access
                </div>
                <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">
                  {course.title}
                </h1>
              </div>
            </div>

            <div className="space-y-6 p-6 md:p-8">
              <p className="max-w-3xl text-base leading-7 text-gray-300 md:text-lg">
                {course.description}
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Access</p>
                  <p className="mt-2 text-sm font-medium text-white">Instant after payment</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Format</p>
                  <p className="mt-2 text-sm font-medium text-white">Video, quiz, certificate</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Support</p>
                  <p className="mt-2 text-sm font-medium text-white">Secure Stripe checkout</p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white md:text-xl">Curriculum preview</h2>
                <div className="mt-4 flex flex-col gap-4">
                  {course.curriculum.map((block, id) => {
                    if (block.blockType === 'video') {
                      return (
                        <div
                          key={id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                        >
                          <div className="text-teal-300 font-semibold flex items-center gap-2">
                            {block.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            Video lesson · {block.duration} min
                          </div>
                        </div>
                      )
                    }

                    if (block.blockType === 'quiz') {
                      return (
                        <div
                          key={id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                        >
                          <div className="text-amber-300 font-semibold flex items-center gap-2">
                            {block.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {block.questions?.length || 0} questions
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-teal-400/20 bg-teal-500/10 p-4 backdrop-blur"
                      >
                        <div className="text-teal-200 font-semibold flex items-center gap-2">
                          {block.blockType === 'finish' ? 'Certificate module' : 'Module'}
                        </div>
                        <div className="text-sm text-gray-300">
                          Certificate available on completion
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <aside className="sticky top-6 rounded-3xl border border-white/10 bg-black/50 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Course fee</p>
                <p className="mt-2 text-4xl font-semibold text-white">{coursePrice}</p>
              </div>
              <div className="rounded-2xl border border-teal-400/20 bg-teal-500/10 p-3 text-teal-300">
                <HiCheckCircle className="text-2xl" />
              </div>
            </div>

            <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              <div className="flex items-center gap-3">
                <HiShieldCheck className="text-teal-300" />
                Secure payment powered by Stripe
              </div>
              <div className="flex items-center gap-3">
                <HiShieldCheck className="text-teal-300" />
                Access is unlocked right after payment confirmation
              </div>
              <div className="flex items-center gap-3">
                <HiShieldCheck className="text-teal-300" />
                Certificate becomes available after completion
              </div>
            </div>

            <div className="mt-6">
              {participation ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-emerald-200">
                    You already own this course.
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    Jump back into the lesson you left off.
                  </p>
                  <div className="mt-4">
                    <ResumeButton participation={participation} />
                  </div>
                </div>
              ) : (
                <CheckoutButton
                  courseId={course.id}
                  courseTitle={course.title}
                  coursePrice={course.price}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default CoursePage
