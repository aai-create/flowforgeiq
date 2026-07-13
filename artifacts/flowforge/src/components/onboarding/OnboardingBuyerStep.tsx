import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { useCreateBuyer, getListBuyersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface FormValues {
  name: string;
  email: string;
}

interface OnboardingBuyerStepProps {
  onCreated: (id: number, name: string) => void;
}

export function OnboardingBuyerStep({ onCreated }: OnboardingBuyerStepProps) {
  const qc = useQueryClient();
  const createBuyer = useCreateBuyer();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { name: "", email: "" } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await createBuyer.mutateAsync({
        data: {
          name: values.name.trim(),
          email: values.email.trim() || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListBuyersQueryKey() });
      setSuccess(true);
      setTimeout(() => onCreated(result.id, result.name), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create buyer";
      setServerError(msg);
    }
  };

  return (
    <div className="px-8 py-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#212833]">Create your first buyer</h2>
          <p className="text-xs text-[#5E687B] mt-0.5">Add the retail brand or client you sell to.</p>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <p className="text-sm font-semibold text-[#212833]">Buyer created!</p>
          <p className="text-xs text-[#5E687B]">Moving to the next step…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Buyer / brand name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: "Buyer name is required" })}
              placeholder="e.g. Vellum Studio"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Buyer email</label>
            <input
              {...register("email", {
                validate: v =>
                  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email",
              })}
              type="email"
              placeholder="e.g. buying@brand.com"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : (
              "Save Buyer"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
