import userModel from '../model/users.model.js'

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

async function me(req, res) {
  const user = await userModel.findById(req.userId).select('-password')
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.status(200).json(sanitizeUser(user))
}

async function updateMe(req, res) {
  const { mobileNo } = req.body ?? {}

  if (typeof mobileNo !== 'string' || !mobileNo.trim()) {
    return res.status(400).json({ message: 'mobileNo is required' })
  }

  const normalizedMobileNo = mobileNo.replace(/\D/g, '')
  if (normalizedMobileNo.length < 10) {
    return res.status(400).json({ message: 'Mobile number must be at least 10 digits' })
  }

  const user = await userModel.findByIdAndUpdate(
    req.userId,
    { $set: { mobileNo: normalizedMobileNo } },
    { new: true },
  )

  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  return res.status(200).json({ message: 'Profile updated', user: sanitizeUser(user) })
}

export default { me, updateMe }
