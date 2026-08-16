import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    CheckCircle,
    Mail,
    Phone,
    Send,
    Shield,
    Sparkles,
    User,
    XCircle,
} from 'lucide-react'
import { fetchCurrentUserThunk, forgotPasswordThunk } from '@/store/authSlice'
import Button from '@/components/atoms/Button'
import { toast } from 'react-hot-toast'

const Profile = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { user: profileData, isLoading, error } = useSelector((state) => state.auth)

    const handleResetPassword = async () => {
        if (!profileData?.email) return
        
        try {
            await dispatch(forgotPasswordThunk(profileData.email)).unwrap()
            toast.success('Password reset link sent.')
        } catch (err) {
            toast.error(err || 'Could not send reset link.')
        }
    }

    useEffect(() => {
        // Luôn fetch lại profile để có data mới nhất
        dispatch(fetchCurrentUserThunk())
    }, [dispatch])

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
                    <p className="text-slate-500 font-medium">Loading profile...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
                <div className="mb-4 rounded-full bg-red-100 p-4 text-red-500">
                    <XCircle className="h-10 w-10" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-slate-800">Oops!</h2>
                <p className="mb-6 text-slate-500">{error}</p>
                <Button onClick={() => navigate('/')}>Return to Home</Button>
            </div>
        )
    }

    if (!profileData) return null

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            const date = new Date(dateString)
            return new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date)
        } catch {
            return dateString
        }
    }

    const displayName = profileData.fullName || profileData.name || 'User'
    const roleLabel = profileData.role?.replace('ROLE_', '') || 'USER'
    const providerLabel = profileData.provider === 'GOOGLE' ? 'Google Account' : 'Local Account'

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 font-sans text-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1200px] space-y-6">
                {/* Header Tiêu đề & Nút Go Back */}
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Personal information</h1>
                        <p className="text-sm text-slate-500">
                            Manage account profile information and basic security settings.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* CỘT TRÁI: AVATAR & THAO TÁC NHANH */}
                    <div className="flex h-fit flex-col items-center rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <div className="group relative mb-4 cursor-pointer">
                            <div className="relative h-28 w-28 rounded-full border-4 border-slate-100 bg-slate-200 flex items-center justify-center overflow-hidden">
                                {profileData.avatarUrl ? (
                                    <img
                                        src={profileData.avatarUrl}
                                        alt={displayName}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-16 w-16 text-slate-400" />
                                )}
                            </div>
                            <button className="absolute right-0 bottom-0 rounded-full bg-blue-600 p-2 text-white shadow-md transition-all group-hover:scale-105 hover:bg-blue-700">
                                <Sparkles className="h-4 w-4" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{displayName}</h3>
                        <p className="mt-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold tracking-wider text-blue-600 uppercase">
                            {roleLabel}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">{profileData.email}</p>

                        <div className="mt-6 w-full space-y-2 border-t border-slate-100 pt-4">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full justify-center"
                                onClick={handleResetPassword}
                            >
                                <Shield className="mr-2 h-4 w-4" /> Change password
                            </Button>
                        </div>
                    </div>

                    {/* CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN */}
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                        <h3 className="mb-6 border-b border-slate-100 pb-2 text-base font-bold text-slate-900">
                            Profile details
                        </h3>

                        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Họ và tên */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Full name</label>
                                    <div className="relative">
                                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            name="fullName"
                                            defaultValue={displayName}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            placeholder="Enter first and last name"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Số điện thoại */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-600">Phone number</label>
                                    <div className="relative">
                                        <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            name="phone"
                                            defaultValue={profileData.phone || ''}
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Địa chỉ Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-400">
                                    Email Address (Cannot be changed)
                                </label>
                                <div className="relative">
                                    <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="email"
                                        defaultValue={profileData.email}
                                        disabled
                                        className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-4 pl-10 text-sm font-medium text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Trạng thái tài khoản (chỉ đọc) */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">Account Status</label>
                                <div className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900">
                                    {profileData.isActive ? (
                                        <>
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-5 w-5 text-red-500" />
                                            Inactive
                                        </>
                                    )}
                                    <span className="text-slate-400 ml-auto text-xs">Joined {formatDate(profileData.createdAt)}</span>
                                </div>
                            </div>

                            {/* Giới thiệu ngắn */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-600">Short introduction</label>
                                <textarea
                                    name="bio"
                                    defaultValue={profileData.bio || ''}
                                    rows={4}
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Describe a little about yourself..."
                                />
                            </div>

                            {/* Nút submit */}
                            <div className="flex justify-end pt-2">
                                <Button type="submit" size="sm" className="px-6">
                                    <Send className="mr-2 h-4 w-4" /> Save changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile

