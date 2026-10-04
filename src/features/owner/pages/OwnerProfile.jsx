import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Camera, Shield, User, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

import Button from '@/components/atoms/Button'
import Header from '@/components/HeaderDashboard'
import Sidebar from '@/components/SideBar'
import { ProfileForm } from '@/form/AuthForms'
import uploadApi from '@/services/uploadApi'
import {
  fetchCurrentUserThunk,
  forgotPasswordThunk,
  updateProfileThunk,
} from '@/store/authSlice'

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const OwnerProfile = ({ currentRole = 'OWNER' }) => {
  const dispatch = useDispatch()
  const { isSidebarExpanded } = useSelector((state) => state.ui)
  const { user: profileData, isLoading, error } = useSelector((state) => state.auth)
  const fileInputRef = useRef(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  const isGoogleAccount = profileData?.provider?.toUpperCase() === 'GOOGLE'
  const displayName = profileData?.fullName || profileData?.name || 'User'
  const roleLabel = profileData?.role?.replace('ROLE_', '') || 'OWNER'

  useEffect(() => {
    dispatch(fetchCurrentUserThunk())
  }, [dispatch])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const handleResetPassword = async () => {
    if (!profileData?.email || isGoogleAccount) return

    try {
      await dispatch(forgotPasswordThunk(profileData.email)).unwrap()
      toast.success('Password reset link sent.')
    } catch (resetError) {
      toast.error(resetError || 'Could not send reset link.')
    }
  }

  const handleUpdateProfile = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    let newAvatarUrl = profileData?.avatarUrl || null

    try {
      if (avatarFile) {
        const response = await uploadApi.uploadImage(avatarFile)
        if (!response?.data?.success) {
          throw new Error(response?.data?.message || 'Upload avatar failed')
        }
        newAvatarUrl = response.data.data
      }

      await dispatch(updateProfileThunk({
        fullName: formData.get('fullName'),
        phone: formData.get('phone') || null,
        avatarUrl: newAvatarUrl,
      })).unwrap()

      toast.success('Profile updated successfully.')
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (updateError) {
      toast.error(updateError?.message || updateError || 'Failed to update profile.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      <div className="flex pt-14">
        <Sidebar currentRole={currentRole} />

        <div
          className={`flex flex-1 flex-col transition-all duration-150 ease-in-out ${
            isSidebarExpanded ? 'md:pl-60' : 'md:pl-18'
          }`}
        >
          <main className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6 md:p-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Personal information</h1>
              <p className="text-sm text-slate-500">
                Manage account profile information and basic security settings.
              </p>
            </div>

            {isLoading && !profileData ? (
              <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <p className="font-medium text-slate-500">Loading profile...</p>
                </div>
              </div>
            ) : error && !profileData ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-center shadow-sm">
                <div className="mb-4 rounded-full bg-red-100 p-4 text-red-500">
                  <XCircle className="h-10 w-10" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-slate-800">Unable to load profile</h2>
                <p className="text-slate-500">{error}</p>
                <Button className="mt-5" onClick={() => dispatch(fetchCurrentUserThunk())}>
                  Try again
                </Button>
              </div>
            ) : profileData ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex h-fit flex-col items-center rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                    }}
                  />

                  <div
                    className="group relative mb-4 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                    }}
                  >
                    <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200">
                      {avatarPreview || profileData.avatarUrl ? (
                        <img
                          src={avatarPreview || profileData.avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-16 w-16 text-slate-400" />
                      )}
                    </div>
                    <span className="absolute right-0 bottom-0 rounded-full bg-blue-600 p-2 text-white shadow-md transition-all group-hover:scale-105 group-hover:bg-blue-700">
                      <Camera className="h-4 w-4" />
                    </span>
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
                      disabled={isGoogleAccount}
                      title={isGoogleAccount ? 'Google accounts manage passwords through Google.' : undefined}
                    >
                      <Shield className="mr-2 h-4 w-4" /> Change password
                    </Button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <ProfileForm
                    key={`${profileData.userId}-${profileData.fullName}-${profileData.phone || ''}-${profileData.avatarUrl || ''}`}
                    embedded
                    fullName={displayName}
                    email={profileData.email}
                    phone={profileData.phone || ''}
                    showBio={false}
                    isActive={profileData.isActive}
                    joinedText={formatDate(profileData.createdAt)}
                    onSubmit={handleUpdateProfile}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}

export default OwnerProfile
