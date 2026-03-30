import jwt from 'jsonwebtoken'

function authMiddelware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
        return res.status(401).json({ message: 'Access token not found' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.id
        req.userRole = decoded.role
        return next()
    } catch {
        return res.status(401).json({ message: 'Invalid or expired access token' })
    }
}

export function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.userRole || !roles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        return next()
    }
}

export default authMiddelware