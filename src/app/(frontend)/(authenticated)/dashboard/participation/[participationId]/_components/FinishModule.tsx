'use client'

import { Course, Participation } from '@/payload-types'
import { useState } from 'react'
import NextButton from './NextButton'
import axios from 'axios'

export default function FinishModule({ participation }: { participation: Participation }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      let course: Course = participation.course as Course
      // Perbaikan: Menggunakan backticks agar ${participation.id} tidak terbaca sebagai teks mentah
      let response = await axios.get(`/printCertificate/${participation.id}`, {
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Certicate-${course.title}.pdf`)
      document.body.appendChild(link)
      link.click()
      
      // Bersihkan elemen link setelah diklik
      document.body.removeChild(link)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Congratulations!</h1>
      <p className="text-gray-400">You have completed the course.</p>
      <NextButton loading={loading} text="Download Certificate" onClick={handleDownload} />
    </div>
  )
}