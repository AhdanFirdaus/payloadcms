import { Participation } from "@/payload-types";
import VideoModule from "./VideoModule";

interface CourseModuleProps {
  module: any
  participation: Participation
  onCompleted: (nextIndex: number) => void
}

export default function CourseModule({ module, participation, onCompleted }: CourseModuleProps) {
  switch (module.blockType) {
    case 'video': return <VideoModule module={module} participation={participation} onCompleted={onCompleted} />
    default: return <div>Unknown module type {module.blockType}</div>
  }
}