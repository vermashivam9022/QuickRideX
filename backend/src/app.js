import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser';
import path from 'node:path'
import usersRoutes from './routes/users.route.js'
import adminRoutes from './routes/admin.route.js'
import authRoutes from './routes/auth.route.js'
import bikesRoutes from './routes/bikes.route.js'
import bookingsRoutes from './routes/bookings.route.js'


const app = express()
app.use(cookieParser())

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)

app.use(cors({
	origin: (origin, callback) => {
		// Allow mobile apps/tools with no origin and be permissive in dev when CORS_ORIGIN is not set.
		if (!origin) return callback(null, true)
		if (allowedOrigins.length === 0) return callback(null, true)
		if (allowedOrigins.includes(origin)) return callback(null, true)
		return callback(new Error('Not allowed by CORS'))
	},
	credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))  // Serve uploaded files statically over http

app.get('/api/health', (_req, res) => {
	res.status(200).json({ ok: true })
})

app.get('/', (_req, res) => {
	res.send('Welcome to the Bike Rental API')
})

app.use('/api/users', usersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/bikes', bikesRoutes)
app.use('/api/bookings', bookingsRoutes)

//error middleware
app.use((err, _req, res, _next) => {
	console.error(err)
	if (err?.code === 11000) {
		return res.status(409).json({ message: 'Duplicate value found. Please use different data.' })
	}
	return res.status(500).json({ message: err?.message || 'Internal server error' })
})


export default app;