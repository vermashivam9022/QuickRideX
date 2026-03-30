import app from './src/app.js'
import connectDb from './src/config/db.js'
import dotenv from 'dotenv';
import { ensureUserIndexes } from './src/model/users.model.js'


dotenv.config();

const PORT = Number(process.env.PORT) || 5000
const HOST = process.env.HOST || '0.0.0.0'

async function startServer() {
    try {
        await connectDb()
        await ensureUserIndexes()
        app.listen(PORT, () => {
            console.log(`server is listening at ${HOST}:${PORT}...`)
        })
    } catch (error) {
        console.error('Failed to connect database. Server not started.')
        console.error(error)
        process.exit(1)
    }
}



void startServer()

