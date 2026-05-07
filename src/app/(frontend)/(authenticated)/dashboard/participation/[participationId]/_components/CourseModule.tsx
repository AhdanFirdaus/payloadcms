import { Participation } from '@/payload-types'
import VideoModule from './VideoModule'
import QuizModule from './QuizModule'
import FinishModule from './FinishModule'

interface CourseModuleProps {
  module: any
  participation: Participation
  onCompleted: (nextIndex: number) => void
}

export default function CourseModule({ module, participation, onCompleted }: CourseModuleProps) {
  switch (module.blockType) {
    case 'video':
      return <VideoModule module={module} participation={participation} onCompleted={onCompleted} />
    case 'quiz':
      return <QuizModule module={module} participation={participation} onCompleted={onCompleted} />
    case 'finish':
      return <FinishModule participation={participation} />
    default:
      return <div>Unknown module type {module.blockType}</div>
  }
}
