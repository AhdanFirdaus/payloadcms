'use client'

import { Participation } from '@/payload-types'
import { useEffect, useState } from 'react'
import { markProgress } from '../_actions/MarkProgress'
import NextButton from './NextButton'
import { HiDocumentSearch } from 'react-icons/hi'

interface QuizModuleProps {
  module: any
  participation: Participation
  onCompleted: (nextIndex: number) => void
}

export default function QuizModule({ module, participation, onCompleted }: QuizModuleProps) {
  const [message, setMessage] = useState<string>('')
  // Perbaikan 1: Pastikan ada spasi dan tipe data yang benar
  const [userAnswers, setUserAnswers] = useState<boolean[][]>([])
  const [loading, setLoading] = useState(false)
  const [allAnswerCorrect, setAllAnswerCorrect] = useState(false)

  useEffect(() => {
    setEmptyUserAnswers()
  }, [])

  function setEmptyUserAnswers() {
    let temp = []

    temp = module.questions.map((question: any) => {
      return question.answers.map((answer: any) => {
        return false
      })
    })
    setUserAnswers(temp)
  }

  async function handleNextModule() {
    setLoading(true)
    try {
      // markProgress
      const updateParticipation = await markProgress(participation)
      if (updateParticipation && updateParticipation.progress) {
        onCompleted(updateParticipation.progress)
      } else {
        console.error('Failed to update progress')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function checkAnswer(asnwerIndex: number) {
    let correct = true
    let length = module.questions[asnwerIndex].answers.length

    for (let n = 0; n < length; n++) {
      let val = module.questions[asnwerIndex].answers[n].true ? true : false
      if (val !== userAnswers[asnwerIndex][n]) {
        correct = false
        break
      }
    }

    return correct
  }

  function checkAllAnswers() {
    for (let i = 0; i < module.questions.length; i++) {
      if (!checkAnswer(i)) {
        return false
      }
    }
    return true
  }

  function handleCheckAnswers() {
    if (checkAllAnswers()) {
      setAllAnswerCorrect(true)
      setUserAnswers([])
    } else {
      setMessage('Some answers are incorrect. Multiple answers can be correct.')
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{module.title}</h2>
      <div className="relative w-full aspect-video border border-white overflow-y-auto p-6">
        {module.questions.map((question: any, index: number) => (
          <div key={index} className="mb-6">
            <p className="text-xl mb-2">{question.question}</p>
            {question.answers.map((answer: any, answerIndex: number) => (
              <div
                className="flex items-center cursor-pointer mb-2"
                key={`${index}-${answerIndex}`}
              >
                <input
                  id={`answer-${index}-${answerIndex}`}
                  type="checkbox"
                  // Perbaikan 2: Logika update array 2D yang aman
                  onChange={(e) => {
                    setMessage('')
                    const newAnswers = [...userAnswers]
                    // Pastikan array untuk pertanyaan ini sudah ada
                    if (!newAnswers[index]) {
                      newAnswers[index] = []
                    }
                    newAnswers[index][answerIndex] = e.target.checked
                    setUserAnswers(newAnswers)
                  }}
                  className="h-4 w-4 text-teal-400 bg-gray-100 border-gray-600 rounded-full focus:ring-2 focus:ring-teal-500"
                />
                <label
                  htmlFor={`answer-${index}-${answerIndex}`}
                  className="ml-4 text-2xl font-medium text-gray-300"
                >
                  {answer.answer}
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>

      {message && <div className="text-red-500 p-2 font-bold">{message}</div>}

      <div className="flex flex-col gap-4 justify-center">
        {allAnswerCorrect ? (
          <NextButton loading={loading} text="Next" onClick={handleNextModule} />
        ) : (
          <div>
            <button
              disabled={allAnswerCorrect}
              onClick={handleCheckAnswers}
              className="inline-flex gap-2 items-center border border-white px-4 py-2"
            >
              Check Answer
              <HiDocumentSearch className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
