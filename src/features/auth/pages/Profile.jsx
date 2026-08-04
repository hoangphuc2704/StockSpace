import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
    Activity,
    ArrowLeft,
    Calendar,
    CheckCircle,
    Mail,
    Phone,
    Send,
    Shield,
    Sparkles,
    User,
    XCircle,
} from 'lucide-react'
import { fetchCurrentUserThunk } from '@/store/authSlice'
import Button from '@/components/atoms/Button'

const Profile = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { user: profileData, isLoading, error } = useSelector((state) => state.auth)

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
            return new Intl.DateTimeFormat('vi-VN', {
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
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                <motion.aside
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto"
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="relative h-44 w-44 rounded-full bg-gradient-to-br from-amber-100 via-orange-100 to-slate-100 p-2">
                            {profileData.avatarUrl ? (
                                <img
                                    src={profileData.avatarUrl}
                                    alt={displayName}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-6xl font-bold text-slate-400">
                                    {displayName.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}

                            <div className="absolute right-6 bottom-3 h-6 w-6 rounded-full border-4 border-white bg-white">
                                {profileData.isActive ? (
                                    <div className="h-full w-full rounded-full bg-green-500" title="Active"></div>
                                ) : (
                                    <div className="h-full w-full rounded-full bg-slate-300" title="Inactive"></div>
                                )}
                            </div>
                        </div>

                        <h1 className="mt-8 bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-4xl font-extrabold text-transparent">
                            {displayName}
                        </h1>

                        <button className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-full bg-slate-900 px-5 text-base font-bold text-white transition-colors hover:bg-slate-800">
                            <Send className="h-5 w-5" />
                            Get In Touch
                            <span className="ml-auto h-5 w-5 rounded-full bg-white"></span>
                        </button>


                    </div>

                    <div className="mt-10 border-t border-slate-200 pt-8">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                            Account
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                {roleLabel}
                            </span>
                            {/* <span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                {providerLabel}
                            </span> */}
                            {/* <span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                ID {profileData.userId || 'N/A'}
                            </span> */}
                        </div>
                    </div>


                </motion.aside>

                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-w-0 py-2 lg:py-8"
                >


                    <h2 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                        Profile
                    </h2>

                    <div className="mt-8 flex flex-wrap gap-8 border-b border-slate-200">
                        <button className="border-b-2 border-slate-900 pb-5 text-lg font-bold text-slate-900">
                            Overview
                        </button>

                    </div>



                    <section className="mt-7 grid gap-6 xl:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                                        Contact
                                    </p>

                                </div>

                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <Mail className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                            Email Address
                                        </p>
                                        <p className="mt-1 break-all text-base font-semibold text-slate-800">
                                            {profileData.email}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Phone className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                            Phone Number
                                        </p>
                                        <p className="mt-1 text-base font-semibold text-slate-800">
                                            {profileData.phone || 'Not provided'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-7 shadow-sm">
                            <div className="mb-6 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                                        Status
                                    </p>
                                    <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                                        Membership details
                                    </h3>
                                </div>
                                <Shield className="h-6 w-6 text-amber-500" />
                            </div>

                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <Calendar className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                            Joined Date
                                        </p>
                                        <p className="mt-1 text-base font-semibold text-slate-800">
                                            {formatDate(profileData.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Activity className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                                            Account Status
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-800">
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
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </motion.main>
            </div>
        </div>
    )
}

export default Profile

