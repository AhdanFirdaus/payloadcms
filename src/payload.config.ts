import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

// Import plugin S3
import { s3Storage } from '@payloadcms/storage-s3'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Customers } from './collections/Customers'
import { Courses } from './collections/courses/Courses'
import brevoAdapter from './utils/brevoAdapter'
import { Participation } from './collections/courses/Participation'
import stripeCheckout from './endpoints/stripeCheckout'
import stripeWebhook from './endpoints/stripeWebhook'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  email: brevoAdapter(),
  collections: [Users, Media, Customers, Courses, Participation],
  endpoints: [stripeCheckout, stripeWebhook],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        // Ganti 'media' dengan slug koleksi media Anda jika berbeda
        ['media']: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true, // WAJIB untuk MinIO agar bisa akses bucket via URL path
        region: process.env.S3_REGION,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
