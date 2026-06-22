import { SignIn } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-7 h-7 rounded-[5px] overflow-hidden shrink-0">
            <img src={`${basePath}/flowforge-logo.png`} alt="FlowForgeIQ" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-[#9000FF]">FlowForgeIQ</span>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full rounded-xl border border-[#E5EAF0] shadow-sm",
              card: "!bg-white !shadow-none !border-0 !rounded-xl",
              footer: "!bg-white !shadow-none !border-0 !rounded-b-xl",
              headerTitle: "text-[#212833] font-bold",
              headerSubtitle: "text-[#5E687B]",
              formButtonPrimary: "bg-[#9000FF] hover:bg-[#7A00D9] !text-white font-semibold",
              formFieldInput: "border-[#E5EAF0] focus:border-[#9000FF] focus:ring-[#9000FF]/20",
              formFieldLabel: "text-[#5E687B] font-medium",
              footerActionLink: "text-[#9000FF] hover:text-[#7A00D9]",
              identityPreviewEditButton: "text-[#9000FF]",
            },
          }}
        />
      </div>
    </div>
  );
}
