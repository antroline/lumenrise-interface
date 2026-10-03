import { CreateLaunch } from './_components/create-launch'

export default function CreateLaunchPage() {
  return (
    <div className="w-full pb-8">
      <div className="mb-6 sm:mb-7">
        <div>
          <h1 className="text-[38px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-[48px]">Create a token</h1>
          <p className="mt-3 text-[16px] text-muted-foreground">Fixed supply on Stellar testnet.</p>
        </div>
      </div>
      <CreateLaunch />
    </div>
  )
}
