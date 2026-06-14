import { QrCode, Smartphone } from "lucide-react";
import * as React from "react";
import { Logo } from "@/components/ui/Logo";
import { useIsMobile } from "@/hooks/useMobile";

const MOBILE_URL = "https://animalmind.vercel.app";

function DesktopMobileNotice() {
  const [qrCodeSrc, setQrCodeSrc] = React.useState<string | null>(null);
  const [hasQrError, setHasQrError] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function generateQrCode() {
      try {
        const QRCode = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(MOBILE_URL, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 232,
          color: {
            dark: "#050608",
            light: "#f8fafc",
          },
        });

        if (isMounted) {
          setQrCodeSrc(dataUrl);
          setHasQrError(false);
        }
      } catch {
        if (isMounted) {
          setHasQrError(true);
        }
      }
    }

    void generateQrCode();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#07080a] text-white flex items-center justify-center px-6 py-10 overflow-hidden">
      <section className="w-full max-w-[420px] rounded-lg border border-white/10 bg-[#0d0f12] p-6 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
            <Logo className="size-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              AnimalMind
            </p>
            <p className="text-sm text-white/52">Experiência mobile-first</p>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/62">
            <Smartphone className="size-3.5 text-emerald-300" />
            Abrir no telemóvel
          </div>
          <h1 className="text-3xl font-black leading-[1.05] tracking-tight text-white">
            O AnimalMind foi feito para mobile
          </h1>
          <p className="text-sm leading-6 text-white/58">
            Lê o QR code com o telemóvel para abrir a versão optimizada para
            gravações, histórico e acompanhamento dos teus animais.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-white p-3">
          {qrCodeSrc ? (
            <img
              src={qrCodeSrc}
              alt={`QR code para abrir ${MOBILE_URL}`}
              className="mx-auto size-[232px]"
              width={232}
              height={232}
            />
          ) : (
            <div className="grid size-[232px] place-items-center rounded-md bg-slate-100 text-slate-500">
              <QrCode className="size-12" />
              <span className="sr-only">
                {hasQrError ? "Erro ao gerar QR code" : "A gerar QR code"}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            Link directo
          </p>
          <a
            href={MOBILE_URL}
            className="mt-1 block text-sm font-bold text-white underline-offset-4 hover:underline"
          >
            animalmind.vercel.app
          </a>
        </div>
      </section>
    </main>
  );
}

export function MobileOnlyGate({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <DesktopMobileNotice />;
  }

  return <>{children}</>;
}
