import { Compass } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'

export default function NotFound() {
  return (
    <ComingSoon
      icon={Compass}
      title="This page doesn’t exist"
      description="The link may be outdated or the launch may have moved. Browse live and upcoming launches instead."
    />
  )
}
