import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { getUser } from '../../../../_actions/getUser'
import { Course, Media } from '@/payload-types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { HiArrowLeft } from 'react-icons/hi'
import Image from 'next/image'

// 1. Ubah tipe data params menjadi Promise
const CoursePage = async ({ params }: { params: Promise<{ courseId: string }> }) => {
  // 2. Unwrapping params menggunakan await
  const { courseId } = await params

  const payload = await getPayload({ config: configPromise })
  const user = await getUser()

  let course: Course | null = null

  try {
    const res = await payload.findByID({
      collection: 'courses',
      id: courseId,
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition duration-3000 ease-in-out"
      >
        <HiArrowLeft className="text-lg" />
        Back to Dashboard
      </Link>
      <div className="flex flex-col-reverse md:flex-row gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{course.title}</h2>
          <p className="text-gray-300">{course.description}</p>
          <p className="text-teal-400 text-xl font-bold mt-4">
            ${new Intl.NumberFormat('en-US').format(course.price)}
          </p>
        </div>
        <div className="flex-1 relative aspect-video overflow-hidden border border-gray-700">
          <Image
            src={(course.image as Media).url || ''}
            alt={course.title || ''}
            fill
            className="object-cover"
          />
        </div>
      </div>

      {/* add checkout process */}
    </div>
  )
}

export default CoursePage
