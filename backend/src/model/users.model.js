import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        mobileNo: {
            type: String,
            required: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['student', 'admin'],
            default: 'student',
        },
        isApproved: {
            type: Boolean,
            default: false,
        },
        licenseUrl: {
            type: String,
            default: '',
        },
        collegeIdUrl: {
            type: String,
            default: '',
        },
    },
    { timestamps: true },
)

const userModel = mongoose.model('Users', userSchema)

export async function ensureUserIndexes() {
    // Ensure DB indexes match schema and remove stale indexes from old schema versions.
    await userModel.syncIndexes()
}

export default userModel