import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import cookie from 'cookie'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production_32chars'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function getAuthUser(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '')
    const token = cookies.iot_auth_token
    if (!token) return null
    return verifyToken(token)
  } catch (err) {
    return null
  }
}

export function withAuth(handler, allowedRoles = []) {
  return async (req, res) => {
    try {
      const cookies = cookie.parse(req.headers.cookie || '')
      const token = cookies.iot_auth_token
      if (!token) return res.status(401).json({ error: 'Unauthorized' })

      const user = verifyToken(token)
      if (!user) return res.status(401).json({ error: 'Invalid token' })

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      req.user = user
      return handler(req, res)
    } catch (err) {
      return res.status(401).json({ error: 'Authentication failed' })
    }
  }
}
