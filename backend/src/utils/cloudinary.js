import { v2 as cloudinary } from 'cloudinary'
import fs from 'node:fs'
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
})

const uploadFile = async (filePath) => {
  try {
    if (!filePath) return null

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'post',
      resource_type: 'auto',
    })

    // Delete local file after successful upload.
    fs.unlinkSync(filePath)

    return { success: true, data: result }
  } catch (error) {
    // Best-effort cleanup for temporary local files.
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    return {
      success: false,
      error: error.message,
    }
  }
}

export { uploadFile }
