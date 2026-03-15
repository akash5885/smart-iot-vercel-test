// Route moved to /api/device-control/[id]
export default function handler(req, res) {
  const { id } = req.query
  res.setHeader('Location', `/api/device-control/${id}`)
  return res.status(308).end()
}
