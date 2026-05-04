import { ReactElement, ReactNode } from 'react'
import './styles.css'

export default function RootLayout({children}: { children: ReactNode }) : ReactElement {
  return (
    <html>
      <body className='bg-black text-white'>
        {children}
      </body>
    </html>
  )
}
