import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { AuthShell, AuthSubmitButton } from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/useLanguage";

export default function VerifyOtpPage() {
  const { verifyOtp } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();

  // Get email from URL params
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on load
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    if (!cleaned) return;

    const newCode = [...code];
    if (cleaned.length > 1) {
      const digits = cleaned.split("").slice(0, 6);
      digits.forEach((digit, i) => {
        newCode[i] = digit;
        if (inputsRef.current[i]) {
          inputsRef.current[i]!.value = digit;
        }
      });
      setCode(newCode);
      const nextFocus = Math.min(digits.length, 5);
      inputsRef.current[nextFocus]?.focus();
      return;
    }

    newCode[index] = cleaned[0];
    setCode(newCode);

    if (index < 5 && cleaned[0]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newCode = [...code];
      if (newCode[index]) {
        newCode[index] = "";
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = "";
        setCode(newCode);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    const cleaned = pastedText.replace(/[^0-9]/g, "");
    if (cleaned.length > 0) {
      const digits = cleaned.split("").slice(0, 6);
      const newCode = [...code];
      digits.forEach((digit, i) => {
        newCode[i] = digit;
      });
      setCode(newCode);
      const nextFocusIndex = Math.min(digits.length, 5);
      inputsRef.current[nextFocusIndex]?.focus();
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      toast.error(
        language === "pt"
          ? "Por favor, introduza o código de 6 dígitos."
          : "Please enter the 6-digit code."
      );
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, fullCode, "signup");
      toast.success(
        language === "pt"
          ? "Email verificado com sucesso!"
          : "Email successfully verified!"
      );
      setLocation("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error(
        language === "pt"
          ? "Código inválido ou expirado. Tenta novamente."
          : "Invalid or expired code. Please try again."
      );
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const isComplete = code.every((digit) => digit !== "");

  return (
    <AuthShell
      title={language === "pt" ? "Verificação OTP" : "OTP Verification"}
      subtitle={
        language === "pt"
          ? `Introduz o código de 6 dígitos enviado para ${email}`
          : `Enter the 6-digit code sent to ${email}`
      }
    >
      <form onSubmit={handleVerify} className="space-y-6">
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-between gap-2 py-4"
          onPaste={handlePaste}
        >
          {code.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => { inputsRef.current[index] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete="one-time-code"
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              className="h-14 w-12 text-center text-xl font-bold bg-zinc-900/50 dark:bg-zinc-900/80 border-2 border-slate-200 dark:border-zinc-800 focus:border-teal-500 dark:focus:border-teal-400 rounded-2xl focus:outline-none focus:ring-0 transition-colors"
            />
          ))}
        </motion.div>

        <AuthSubmitButton
          loading={loading}
          loadingLabel={language === "pt" ? "A verificar..." : "Verifying..."}
          disabled={!isComplete}
        >
          {language === "pt" ? "Verificar Código" : "Verify Code"}
        </AuthSubmitButton>

        <div className="text-center text-xs text-muted-foreground mt-4">
          <Link href="/login" className="hover:text-foreground underline">
            {language === "pt" ? "Voltar ao Login" : "Back to Login"}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
