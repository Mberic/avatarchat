export const metadata = {
  title: 'AvatarChat',
  description: 'P2P Video chat using edge detection',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}