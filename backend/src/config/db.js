import mongoose from 'mongoose'

mongoose.set('bufferCommands', false)

const connectDb = async () => {
    const mongoUrl = process.env.MONGO_URL
    if (!mongoUrl) {
        throw new Error('MONGO_URL is missing in environment variables')
    }

    await mongoose.connect(mongoUrl, {
        dbName: 'Authentication',
        serverSelectionTimeoutMS: 5000,
    })

    console.log('connected to database successfully...')
}

export default connectDb