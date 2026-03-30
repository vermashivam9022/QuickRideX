import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

const uploadsDir = path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '')
    const base = path.basename(file.originalname || 'file', ext)
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 60)
    cb(null, `${Date.now()}-${safeBase}${ext}`)
  },
})

const upload = multer({ storage })

export default upload
