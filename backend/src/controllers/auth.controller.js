import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import sessionModel from '../model/session.model.js'
import userModel from '../model/users.model.js'
import { uploadFile } from '../utils/cloudinary.js'

function sanitizeUser(user) {
    return {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNo: user.mobileNo,
        role: user.role,
        isApproved: user.isApproved,
        licenseUrl: user.licenseUrl,
        collegeIdUrl: user.collegeIdUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }
}

function getAdminEmails() {
    const raw = process.env.ADMIN_EMAILS || ''
    return raw
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
}

function signAccessToken(user, sessionId) {
    return jwt.sign(
        { id: user._id, role: user.role, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
    )
}

function getRefreshCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production'
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'strict',
    }
}

async function register(req, res) {
    const { name, email, mobileNo, password, licenseUrl, collegeIdUrl } = req.body
    const drivingLicenseFile = req.files?.drivingLicenseFile?.[0]
    const collegeIdFile = req.files?.collegeIdFile?.[0]

    if (!name || !email || !mobileNo || !password) {
        return res.status(400).json({ message: 'name, email, mobileNo and password are required' })
    }

    const normalizedMobileNo = String(mobileNo).replace(/\D/g, '')
    if (normalizedMobileNo.length < 10) {
        return res.status(400).json({ message: 'Mobile number must be at least 10 digits' })
    }

    if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const isUserExist = await userModel.findOne({ email: normalizedEmail })
    if (isUserExist) {
        return res.status(409).json({ message: 'User already exists' })
    }

    const adminEmails = getAdminEmails()
    const isAdmin = adminEmails.includes(normalizedEmail)

    let uploadedLicenseUrl = typeof licenseUrl === 'string' ? licenseUrl : ''
    let uploadedCollegeIdUrl = typeof collegeIdUrl === 'string' ? collegeIdUrl : ''

    if (drivingLicenseFile?.path) {
        const uploaded = await uploadFile(drivingLicenseFile.path)
        if (!uploaded?.success || !uploaded?.data?.secure_url) {
            return res.status(500).json({ message: uploaded?.error || 'Failed to upload driving license' })
        }
        uploadedLicenseUrl = uploaded.data.secure_url
    }

    if (collegeIdFile?.path) {
        const uploaded = await uploadFile(collegeIdFile.path)
        if (!uploaded?.success || !uploaded?.data?.secure_url) {
            return res.status(500).json({ message: uploaded?.error || 'Failed to upload college ID' })
        }
        uploadedCollegeIdUrl = uploaded.data.secure_url
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    let user
    try {
        user = await userModel.create({
            name,
            email: normalizedEmail,
            mobileNo: normalizedMobileNo,
            password: hashedPassword,
            role: isAdmin ? 'admin' : 'student',
            isApproved: isAdmin ? true : true,
            licenseUrl: uploadedLicenseUrl,
            collegeIdUrl: uploadedCollegeIdUrl,
        })
    } catch (error) {
        if (error?.code === 11000) {
            if (error?.keyPattern?.email) {
                return res.status(409).json({ message: 'User already exists with this email' })
            }
            if (error?.keyPattern?.name) {
                return res.status(409).json({
                    message: 'Duplicate name index detected in database. Restart server and try again.',
                })
            }
            return res.status(409).json({ message: 'Duplicate data found. Please try different values.' })
        }
        throw error
    }

    const session = await sessionModel.create({
        userId: user._id,
        refreshTokenHash: 'pending',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
    })

    const refreshToken = jwt.sign(
        { id: user._id, role: user.role, sessionId: session._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
    )

    session.refreshTokenHash = await bcrypt.hash(refreshToken, 10)
    await session.save()

    res.cookie('refreshToken', refreshToken, {
        ...getRefreshCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    const accessToken = signAccessToken(user, session._id)

    return res.status(201).json({
        message: 'User created successfully',
        user: sanitizeUser(user),
        accessToken,
        token: accessToken,
    })
}

async function login(req, res) {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const user = await userModel.findOne({ email: normalizedEmail })

    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)
    if (!isPasswordMatch) {
        return res.status(400).json({ message: 'Invalid email or password' })
    }

    const session = await sessionModel.create({
        userId: user._id,
        refreshTokenHash: 'pending',
        ip: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
    })

    const refreshToken = jwt.sign(
        { id: user._id, role: user.role, sessionId: session._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
    )

    session.refreshTokenHash = await bcrypt.hash(refreshToken, 10)
    await session.save()

    res.cookie('refreshToken', refreshToken, {
        ...getRefreshCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    const accessToken = signAccessToken(user, session._id)

    return res.status(200).json({
        message: 'Login successful',
        user: sanitizeUser(user),
        accessToken,
        token: accessToken,
    })
}

async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
        return res.status(401).json({ message: 'Unauthorized: Refresh token not found' })
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
        const session = await sessionModel.findOne({ _id: decoded.sessionId, revoked: false })

        if (!session) {
            return res.status(401).json({ message: 'Invalid session' })
        }

        const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid token' })
        }

        const user = await userModel.findById(decoded.id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        const accessToken = signAccessToken(user, session._id)
        return res.status(200).json({ message: 'Token refreshed', accessToken, token: accessToken })
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' })
    }
}

async function logout(req, res) {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
        return res.status(200).json({ message: 'Logout successful' })
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET)
        await sessionModel.findByIdAndUpdate(decoded.sessionId, { revoked: true })
    } catch {
        // Ignore invalid refresh token during logout.
    }

    res.clearCookie('refreshToken', getRefreshCookieOptions())
    return res.status(200).json({ message: 'Logout successful' })
}

async function logoutAll(req, res) {
    await sessionModel.updateMany({ userId: req.userId }, { revoked: true })
    res.clearCookie('refreshToken', getRefreshCookieOptions())
    return res.status(200).json({ message: 'Logout from all devices successful' })
}

async function dashboard(req, res) {
    const user = await userModel.findById(req.userId)
    if (!user) {
        return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({ message: 'User profile', user: sanitizeUser(user) })
}

export default { register, login, logout, dashboard, refreshToken, logoutAll }