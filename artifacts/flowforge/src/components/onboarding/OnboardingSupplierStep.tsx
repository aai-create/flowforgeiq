import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, Loader2, Factory } from "lucide-react";
import { useCreateSupplier, getListSuppliersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface FormValues {
  name: string;
  country: string;
  contactEmail: string;
}

interface OnboardingSupplierStepProps {
  onCreated: (id: number, name: string) => void;
}

export function OnboardingSupplierStep({ onCreated }: OnboardingSupplierStepProps) {
  const qc = useQueryClient();
  const createSupplier = useCreateSupplier();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { name: "", country: "", contactEmail: "" } });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await createSupplier.mutateAsync({
        data: {
          name: values.name.trim(),
          country: values.country.trim() || undefined,
          contactEmail: values.contactEmail.trim() || undefined,
        },
      });
      await qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
      setSuccess(true);
      setTimeout(() => onCreated(result.id, result.name), 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create supplier";
      setServerError(msg);
    }
  };

  return (
    <div className="px-8 py-7">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#9000FF]/8 border border-[#9000FF]/15 flex items-center justify-center shrink-0">
          <Factory className="w-4.5 h-4.5 text-[#9000FF]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#212833]">Create your first supplier</h2>
          <p className="text-xs text-[#5E687B] mt-0.5">Add the factory or vendor you source from.</p>
        </div>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <p className="text-sm font-semibold text-[#212833]">Supplier created!</p>
          <p className="text-xs text-[#5E687B]">Moving to the next step…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">
              Supplier name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("name", { required: "Supplier name is required" })}
              placeholder="e.g. Guangzhou Metalworks"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Country</label>
            <input
              {...register("country")}
              placeholder="e.g. China"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E687B] mb-1">Contact email</label>
            <input
              {...register("contactEmail", {
                validate: v =>
                  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email",
              })}
              type="email"
              placeholder="e.g. sales@supplier.com"
              className="w-full border border-[#E5EAF0] rounded-lg px-3 py-2 text-sm text-[#212833] placeholder:text-[#C0C8D4] outline-none focus:border-[#9000FF] focus:ring-1 focus:ring-[#9000FF]/20 transition-colors"
            />
            {errors.contactEmail && (
              <p className="text-xs text-red-500 mt-1">{errors.contactEmail.message}</p>
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
            style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}
          >
            {isSubmitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : (
              "Save Supplier"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
