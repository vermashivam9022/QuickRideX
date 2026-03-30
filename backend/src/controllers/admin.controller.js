import userModel from '../model/users.model.js'
import shopStatusModel from '../model/shop-status.model.js'

async function listPendingStudents(_req, res) {
  const users = await userModel
    .find({ role: 'student', isApproved: false })
    .select('-password')
    .sort({ createdAt: -1 })

  return res.status(200).json(users)
}

async function approveStudent(req, res) {
  const { id } = req.params

  const user = await userModel.findById(id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.role !== 'student') {
    return res.status(400).json({ message: 'Only student accounts can be approved' })
  }

  user.isApproved = true
  await user.save()

  return res.status(200).json({ message: 'Student approved', user })
}

async function updateStudentVerification(req, res) {
  const { id } = req.params
  const { isApproved } = req.body ?? {}

  if (typeof isApproved !== 'boolean') {
    return res.status(400).json({ message: 'isApproved boolean is required' })
  }

  const user = await userModel.findById(id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user.role !== 'student') {
    return res.status(400).json({ message: 'Only student accounts can be verified' })
  }

  user.isApproved = isApproved
  await user.save()

  return res.status(200).json({
    message: isApproved ? 'Student verified' : 'Student marked as not verified',
    user,
  })
}

async function getShopStatus(_req, res) {
  const status = await shopStatusModel.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { isOpen: true } },
    { new: true, upsert: true },
  )

  return res.status(200).json({ isOpen: Boolean(status?.isOpen) })
}

async function updateShopStatus(req, res) {
  const { isOpen } = req.body ?? {}
  if (typeof isOpen !== 'boolean') {
    return res.status(400).json({ message: 'isOpen boolean is required' })
  }

  const status = await shopStatusModel.findOneAndUpdate(
    { key: 'main' },
    { isOpen },
    { new: true, upsert: true },
  )

  return res.status(200).json({ message: 'Shop status updated', isOpen: Boolean(status?.isOpen) })
}

export default {
  listPendingStudents,
  approveStudent,
  updateStudentVerification,
  getShopStatus,
  updateShopStatus,
}
