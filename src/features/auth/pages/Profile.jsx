import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    ArrowLeft,
    Shield,
    Sparkles,
    User,
    XCircle,
} from 'lucide-react'
import { fetchCurrentUserThunk, forgotPasswordThunk } from '@/store/authSlice'
import Button from '@/components/atoms/Button'
import { toast } from 'react-hot-toast'
import { ProfileForm } from '@/form/AuthForms'

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

                        <ProfileForm
                            embedded
                            fullName={displayName}
                            email={profileData.email}
                            phone={profileData.phone || ''}
                            bio={profileData.bio || ''}
                            isActive={profileData.isActive}
                            joinedText={formatDate(profileData.createdAt)}
                            onSubmit={(event) => event.preventDefault()}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile

