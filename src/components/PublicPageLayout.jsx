import { Outlet } from 'react-router-dom'
import PublicHeader from './PublicHeader'

const PublicPageLayout = () => (
  <>
    <PublicHeader />
    <Outlet />
  </>
)

export default PublicPageLayout
