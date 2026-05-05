"use client"

import { Course, Participation } from "@/payload-types";
import { useState } from "react";
import Curriculum from "./Curiculum";
import CourseModule from "./CourseModule";

export default function CourseViewer({ participation }: { participation: Participation }) {
  const [currentProgress, setCurrentProgress] = useState(participation.progress ?? 0);

  const course: Course = participation.course as Course;

  async function handleComplete(nextIndex: number) {
    setCurrentProgress(nextIndex);
  }

  return (
    <div className="w-full flex flex-col gap-6">
        <CourseModule module={course.curriculum[currentProgress]} participation={participation} onCompleted={handleComplete} />
        <Curriculum course={course} currentProgress={currentProgress} />
    </div>
  );
}