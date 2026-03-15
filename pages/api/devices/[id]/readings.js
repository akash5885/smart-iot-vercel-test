// Route moved to /api/device-readings/[id]
export default function handler(req, res) {
  const { id } = req.query
  res.setHeader('Location', `/api/device-readings/${id}`)
  return res.status(308).end()
}
