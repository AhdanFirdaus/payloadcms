'use client'

import Link from 'next/link'
import { HiArrowRight, HiLockClosed } from 'react-icons/hi'

export default function StartCourseButton({ courseId }: { courseId: string }) {
  return (
    <Link
      href={`/dashboard/course/${courseId}/buy`}
      className="mt-6 inline-flex items-center gap-3 rounded-full border border-teal-400/30 bg-teal-500 px-6 py-3 font-semibold text-white shadow-[0_0_30px_rgba(20,184,166,0.2)] transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-teal-400"
    >
      <HiLockClosed className="text-lg" />
      <span>Buy Course</span>
      <HiArrowRight className="text-lg" />
    </Link>
  )
}
