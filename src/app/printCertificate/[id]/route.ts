import { getUser } from '@/app/(frontend)/(authenticated)/_actions/getUser'
import { Course, Participation } from '@/payload-types'
import configPromise from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import ejs from 'ejs'
import axios from 'axios'

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
    })
    stream.on('error', (err) => {
      reject(err)
    })
    stream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
  })
}

export const GET = async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const payload = await getPayload({
      config: configPromise,
    })
    const user = await getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { id: participationId } = await params

    const participation: Participation = await payload.findByID({
      collection: 'participation',
      id: participationId,
      overrideAccess: false,
      user: user,
    })
    if (!participation) {
      return new Response('Participation not found', { status: 404 })
    }

    const course: Course = participation.course as Course

    const lastModule = course.curriculum[course.curriculum.length - 1]
    if (lastModule.blockType !== 'finish') {
      return new Response('Course has no certificate', { status: 400 })
    }

    if (participation.progress !== course.curriculum.length - 1) {
      return new Response('Course not finished', { status: 400 })
    }

    if (!('template' in lastModule)) {
      return new Response('Template not found', { status: 400 })
    }

    const html = ejs.render(lastModule.template, {
      name: user?.email,
      courseTitle: course.title,
      date: new Date(participation.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    })

    const pdfResponse = await axios({
      method: 'post',
      // URL diperbarui sesuai snippet RapidAPI terbaru
      url: 'https://windypdf.p.rapidapi.com/convert',
      data: {
        landscape: false,
        html: html,
        format: 'A4',
        tailwind: true,
      },
      headers: {
        'Content-Type': 'application/json',
        // Gunakan Key terbaru yang kamu dapatkan dari dashboard
        'x-rapidapi-key': process.env.WINDYPDF_API_KEY,
        'x-rapidapi-host': 'windypdf.p.rapidapi.com',
      },
      responseType: 'stream',
    })

    const buffer = await streamToBuffer(pdfResponse.data)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${course.title}-certificate.pdf"`,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
