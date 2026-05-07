'use client'

import { useState } from 'react'
import { AiOutlineLoading } from 'react-icons/ai'
import { HiArrowRight, HiCreditCard, HiExclamationCircle } from 'react-icons/hi'

type CheckoutButtonProps = {
  courseId: string
  courseTitle: string
  coursePrice: number
}

export default function CheckoutButton({
  courseId,
  courseTitle,
  coursePrice,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create checkout session')
      }

      if (!result?.url) {
        throw new Error('Checkout URL is missing')
      }

      window.location.assign(result.url)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_60px_rgba(20,184,166,0.35)] transition duration-300 ease-in-out hover:-translate-y-0.5 hover:from-teal-400 hover:via-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <AiOutlineLoading className="animate-spin text-xl" />
        ) : (
          <HiCreditCard className="text-xl" />
        )}
        <span>
          Pay{' '}
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(coursePrice)}
        </span>
        <HiArrowRight className="text-xl" />
      </button>

      <p className="text-xs text-gray-400">
        You are about to purchase <span className="text-gray-200">{courseTitle}</span>.
      </p>

      {error && (
        <p className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <HiExclamationCircle className="text-lg" />
          {error}
        </p>
      )}
    </div>
  )
}
