import dotenv from 'dotenv'
import connectDb from '../src/config/db.js'
import bikeModel from '../src/model/bike.model.js'

dotenv.config()

async function run() {
  await connectDb()

  const result = await bikeModel.updateMany(
    {
      $or: [{ category: { $exists: false } }, { category: null }, { category: '' }],
    },
    {
      $set: { category: 'bike' },
    },
  )

  // eslint-disable-next-line no-console
  console.log(
    `Backfill complete. matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  )

  process.exit(0)
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Backfill failed:', err)
  process.exit(1)
})
