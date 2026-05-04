'use client'

import { useRouter } from 'next/navigation'
import React, { ReactElement, useState } from 'react'
import SubmitButton from '../../components/SubmitButton'
import { login, type LoginResponse } from '../actions/login' // Pastikan LoginResponse diimpor

export default function LoginForm(): ReactElement {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // TAMBAHKAN 'async' di depan fungsi ini
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      // Sekarang await diperbolehkan
      const result: LoginResponse = await login({ email, password });

      if (result.success) {
        router.push('/dashboard');
        // Jangan set isPending(false) di sini karena kita akan pindah halaman
      } else {
        setError(result.error || 'Login failed. Please try again.');
        setIsPending(false); // Matikan loading jika gagal
      }
    } catch (e) {
      setError('An unexpected error occurred.');
      setIsPending(false);
    }
  }

  return (
    <div className="flex gap-8 min-h-full flex-col justify-center items-center">
      <div className="text-3xl font-bold">Login</div>
      <div className="w-full mx-auto sm:max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email">Email</label>
            <input 
              className="w-full border p-2 rounded" 
              name="email" 
              id="email" 
              type="email" 
              required 
            />
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <label htmlFor="password">Password</label>
            <input 
              className="w-full border p-2 rounded" 
              name="password" 
              id="password" 
              type="password" 
              required 
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <SubmitButton loading={isPending} text="Login" />
        </form>
      </div>
    </div>
  )
}``