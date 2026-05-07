"use client"

import { Course } from '@/payload-types'
import { HiFlag, HiPencilAlt, HiVideoCamera } from 'react-icons/hi'

export default function Curriculum({
  course,
  currentProgress,
}: {
  course: Course
  currentProgress: number
}) {
  return (
    <div className="flex flex-col gap-4 max-h-[20rem] overflow-y-auto">
      {course.curriculum.map((block, index) => {
        const isCurrent = index === currentProgress

        const baseClass = 'p-4 border rounded bg-gray-900'
        const borderClass = isCurrent ? 'border-white' : 'border-gray-700'

        const className = `${baseClass} ${borderClass}`

        if (block.blockType === 'video') {
          return (
            <div key={index} className={className}>
              <div className="text-teal-400 font-semibbold flex items-center gap-2">
                <HiVideoCamera className="text-xl" />
                {block.title}
              </div>
              <div className="text-sm text-gray-400">Duration: {block.duration} min</div>
            </div>
          )
        }
        if (block.blockType === 'quiz') {
          return (
            <div key={index} className={className}>
              <div className="text-yellow-400 font-semibbold flex items-center gap-2">
                <HiPencilAlt className="text-xl" />
                {block.title}
              </div>
              <div className="text-sm text-gray-400">Questions: {block.questions?.length || 0}</div>
            </div>
          )
        }

        if (block.blockType === 'finish') {
          return (
            <div key={index} className={className}>
              <div className="text-green-400 font-semibbold flex items-center gap-2">
                <HiFlag className="text-xl" />
                Certificate
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}
