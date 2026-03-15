import cookie from 'cookie'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Clear the auth cookie by setting maxAge to 0
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('iot_auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    )

    return res.status(200).json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
