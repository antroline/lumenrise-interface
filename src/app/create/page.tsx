import { ProjectMark } from '@/components/project-mark'
import { PageHeader } from '@/components/page-header'
import { Stepper, type Step } from '@/components/stepper'
import { CreateDraft } from './_components/create-draft'

const steps: Step[] = ['Project', 'Token', 'Mechanism', 'Raise', 'Eligibility', 'Vesting', 'Schedule', 'Contracts', 'Review'].map((label, index) => ({
  key: label,
  label,
  state: index < 2 ? 'done' : index === 2 ? 'current' : index === 8 ? 'todo' : 'open',
}))

export default function CreateLaunchPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageHeader
        eyebrow="Create launch"
        title="Configure your raise"
        description={<span className="inline-flex items-center gap-2"><ProjectMark name="Tidewell" size={24} /> Tidewell · TIDE <span className="text-faint">· Local draft preview</span></span>}
      />
      <Stepper steps={steps} className="border-y border-divider py-5" />
      <CreateDraft />
    </div>
  )
}
