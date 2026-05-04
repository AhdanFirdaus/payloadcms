import axios from 'axios'
import { EmailAdapter, SendEmailOptions } from 'payload'

const brevoAdapter = (): EmailAdapter => {
  // Payload mengharapkan properti pengirim default di sini
  const adapter = () => ({
    name: 'brevo',
    defaultFromAddress: process.env.BREVO_SENDER_EMAIL as string,
    defaultFromName: process.env.BREVO_SENDER_NAME as string,
    sendEmail: async (message: SendEmailOptions): Promise<unknown> => {
      if (process.env.BREVO_EMAILS_ACTIVE !== 'true') {
        console.log('Emails disabled, logging to console')
        console.log(message)
        return
      }

      try {
        const res = await axios({
          method: 'post',
          url: 'https://api.brevo.com/v3/smtp/email',
          headers: {
            'api-key': process.env.BREVO_API_KEY || '',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          data: {
            sender: {
              name: message.fromName || process.env.BREVO_SENDER_NAME,
              email: message.fromAddress || process.env.BREVO_SENDER_EMAIL,
            },
            to: [
              {
                email: message.to as string,
              },
            ],
            subject: message.subject,
            htmlContent: message.html,
          },
        })
        return res.data
      } catch (error) {
        console.error('Error sending email via Brevo:', error)
        throw error // Sebaiknya di-throw agar Payload tahu jika pengiriman gagal
      }
    },
  })

  return adapter as unknown as EmailAdapter; 
  // Atau lebih baik biarkan TypeScript melakukan inferensi dengan struktur yang benar
}

export default brevoAdapter;