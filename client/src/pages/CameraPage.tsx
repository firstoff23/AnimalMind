import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Camera, RefreshCw, Check, AlertCircle, ArrowLeft, RefreshCw as LoopIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";

type UploadState = "idle" | "uploading" | "processing" | "success" | "error";
type CameraPermissionState = "prompt" | "allowed" | "denied" | "error";

export default function CameraPage() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [permissionState, setPermissionState] = useState<CameraPermissionState>("prompt");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // base64 JPEG
  const [classificationResult, setClassificationResult] = useState<any>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const { data: activeAnimal } = trpc.animals.getActive.useQuery();
  const saveVisionMutation = trpc.classify.saveVisionEvent.useMutation();

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = language === "pt"
        ? "O seu browser ou dispositivo não suporta acesso à câmara."
        : "Your browser or device does not support camera access.";
      setErrorMessage(msg);
      setPermissionState("error");
      return;
    }

    // Stop existing stream if any
    stopCamera();

    try {
      setPermissionState("prompt");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setPermissionState("allowed");
      setErrorMessage(null);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.error("Play error:", err));
      }
    } catch (err) {
      console.error("Camera access error:", err);
      let nextState: CameraPermissionState = "error";
      let msg = language === "pt" ? "Não foi possível aceder à câmara." : "Could not access camera.";

      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg = language === "pt" 
            ? "Permissão de câmara negada. Por favor, ative-a nas definições do browser." 
            : "Camera permission denied. Please enable it in browser settings.";
          nextState = "denied";
        }
      }

      setErrorMessage(msg);
      setPermissionState(nextState);
      toast.error(msg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  useEffect(() => {
    // Start camera only on explicit action or when permitted/prompt state
    if (permissionState === "prompt") {
      void startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create an offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(dataUrl);
      
      // Stop the camera once captured to save battery/bandwidth
      stopCamera();
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setClassificationResult(null);
    setUploadState("idle");
    setUploadProgress(0);
    void startCamera();
  };

  const handleDelete = () => {
    setCapturedImage(null);
    setClassificationResult(null);
    setUploadState("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    stopCamera();
    setPermissionState("prompt");
  };

  const handleConfirm = async () => {
    if (!capturedImage) return;
    if (!activeAnimal) {
      toast.error(language === "pt" ? "Selecione ou crie um animal ativo no perfil primeiro." : "Please select or create an active pet in profile first.");
      return;
    }

    // Type check (standardized error)
    if (!capturedImage.startsWith("data:image/jpeg") && !capturedImage.startsWith("data:image/jpg") && !capturedImage.startsWith("data:image/png") && !capturedImage.startsWith("data:application/pdf")) {
      setUploadState("error");
      setErrorMessage(
        language === "pt"
          ? "Formato não suportado. Usa JPG, PNG ou PDF."
          : "Unsupported format. Use JPG, PNG or PDF."
      );
      return;
    }

    // Size check (standardized error)
    const base64Image = capturedImage.split(",")[1];
    const sizeInBytes = (base64Image.length * 3) / 4;
    if (sizeInBytes > 20 * 1024 * 1024) {
      setUploadState("error");
      setErrorMessage(
        language === "pt"
          ? "Ficheiro demasiado grande. Máximo 20 MB."
          : "File too large. Maximum 20 MB."
      );
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);

    // Simulate progress bar (0 to 100%)
    const duration = 1200; // 1.2s
    const step = 10;
    const increment = 100 / (duration / step);
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress = Math.min(100, currentProgress + increment);
      setUploadProgress(Math.round(currentProgress));
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploadState("processing");
        sendToClassification();
      }
    }, step);
  };

  const sendToClassification = () => {
    if (!capturedImage || !activeAnimal) return;
    
    // Extract base64 part
    const base64Image = capturedImage.split(",")[1];

    saveVisionMutation.mutate(
      {
        animalId: activeAnimal.id,
        posture: "sitting", // Default simulated posture detection or fallback
        image: base64Image,
      },
      {
        onSuccess: (data) => {
          setClassificationResult(data);
          setUploadState("success");
          toast.success(language === "pt" ? "Análise visual concluída!" : "Visual analysis completed!");
        },
        onError: (err) => {
          console.error("Save vision event failed:", err);
          setUploadState("error");
          const isNetError = !navigator.onLine || err.message?.toLowerCase().includes("network") || err.message?.toLowerCase().includes("failed to fetch") || err.message?.toLowerCase().includes("offline");
          setErrorMessage(
            isNetError
              ? (language === "pt" ? "Ligação interrompida. Tentar novamente." : "Connection interrupted. Try again.")
              : (language === "pt" ? "Não foi possível analisar o ficheiro. Tenta novamente." : "Could not analyze the file. Try again.")
          );
        },
      }
    );
  };

  const openSettings = () => {
    // Fallback info for permission activation
    toast.info(
      language === "pt"
        ? "Para conceder permissão, clique no ícone do cadeado na barra de endereço do browser."
        : "To grant permission, click the lock icon in the browser's address bar."
    );
  };

  return (
    <div className="page-enter min-h-full px-4 pt-4 pb-6 max-w-lg mx-auto flex flex-col justify-between h-[calc(100vh-4.5rem)]">

      {/* Main View Area */}
      <div className="flex-1 flex flex-col justify-center my-4 relative rounded-3xl overflow-hidden bg-slate-950 border border-border/40 shadow-inner min-h-[300px]">
        <AnimatePresence mode="wait">
          {capturedImage ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col justify-between p-4 bg-slate-900"
            >
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-white/5 relative">
                <img
                  src={capturedImage}
                  alt="Captured review"
                  className="w-full h-full object-cover"
                />

                {/* Overlays / Progress indicators */}
                {uploadState === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6" aria-live="polite">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                      {language === "pt" ? "A enviar..." : "Uploading..."}
                    </span>
                    <Progress value={uploadProgress} className="w-full max-w-[200px] bg-white/10" />
                    <span className="text-xs text-white mt-1.5 font-bold">{uploadProgress}%</span>
                  </div>
                )}

                {uploadState === "processing" && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6" aria-live="polite">
                    <LoopIcon className="w-8 h-8 text-primary animate-spin mb-3" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {language === "pt" ? "A processar..." : "Processing..."}
                    </span>
                  </div>
                )}

                {uploadState === "success" && classificationResult && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6" aria-live="polite">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 mb-3 animate-bounce">
                      <Check size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {language === "pt" ? "Concluído!" : "Success!"}
                    </span>
                    <Badge className="mt-2 text-xl px-3 py-1.5 bg-card/80 border border-border/50 text-foreground flex gap-1.5">
                      <span>{classificationResult.emoji}</span>
                      <span>{classificationResult.state.toUpperCase()}</span>
                    </Badge>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Confiança: {Math.round(classificationResult.confidence * 100)}%
                    </p>
                  </div>
                )}

                {uploadState === "error" && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center" aria-live="polite">
                    <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
                    <span className="text-sm font-semibold text-rose-400">
                      {language === "pt" ? "Erro" : "Error"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                )}
              </div>

              {/* Review CTAs */}
              {uploadState === "idle" && (
                <div className="flex gap-3 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    className="flex-1 text-xs font-semibold h-11 border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    {language === "pt" ? "Eliminar" : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRetry}
                    className="flex-1 text-xs font-semibold h-11 border-white/10"
                  >
                    {language === "pt" ? "Repetir" : "Retry"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 text-xs font-semibold h-11 bg-primary text-primary-foreground hover:bg-emerald-600 shadow-md shadow-primary/20"
                  >
                    {language === "pt" ? "Confirmar" : "Confirm"}
                  </Button>
                </div>
              )}

              {(uploadState === "success" || uploadState === "error") && (
                <Button
                  type="button"
                  onClick={handleRetry}
                  variant="outline"
                  className="w-full text-xs font-semibold h-11 mt-4 border-white/10"
                >
                  {uploadState === "success" 
                    ? (language === "pt" ? "Tirar outra foto" : "Take another photo") 
                    : (language === "pt" ? "Tentar novamente" : "Try again")}
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="stream"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col justify-between"
            >
              {permissionState === "allowed" ? (
                <div className="w-full h-full relative flex-1">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Camera overlay grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-white/15" />
                    <div className="border-r border-b border-white/15" />
                    <div className="border-b border-white/15" />
                    <div className="border-r border-b border-white/15" />
                    <div className="border-r border-b border-white/15" />
                    <div className="border-b border-white/15" />
                    <div className="border-r border-white/15" />
                    <div className="border-r border-white/15" />
                    <div className="bg-transparent" />
                  </div>
                  
                  {/* Species tag overlay */}
                  {activeAnimal && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-black/60 text-[10px] py-1 border border-white/10 uppercase tracking-wider font-semibold">
                        {activeAnimal.species === "dog" ? "Cão" : "Gato"}: {activeAnimal.name}
                      </Badge>
                    </div>
                  )}

                  {/* Switch Camera Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={switchCamera}
                    className="absolute top-3 right-3 bg-black/55 text-white hover:bg-black/80 rounded-full w-9 h-9 border border-white/10"
                  >
                    <RefreshCw size={15} />
                  </Button>

                  {/* LARGE CENTERED CAPTURE CTA */}
                  <div className="absolute inset-x-0 bottom-6 flex justify-center">
                    <motion.button
                      onClick={handleCapture}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-18 h-18 rounded-full border-4 border-white bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center shadow-2xl relative"
                      title={language === "pt" ? "Tirar Foto" : "Take Photo"}
                      aria-label={language === "pt" ? "Tirar foto" : "Take photo"}
                    >
                      <div className="w-13 h-13 rounded-full bg-white shadow-md" />
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  {permissionState === "denied" ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                        <AlertCircle size={24} />
                      </div>
                      <h3 className="font-bold text-foreground text-sm">
                        {language === "pt" ? "Acesso à câmara negado" : "Camera access denied"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                        {errorMessage}
                      </p>
                      <Button
                        type="button"
                        onClick={openSettings}
                        size="sm"
                        className="bg-primary text-primary-foreground font-semibold text-xs active-scale"
                      >
                        {language === "pt" ? "Abrir Definições" : "Open Settings"}
                      </Button>
                    </>
                  ) : permissionState === "error" ? (
                    <>
                      <AlertCircle className="w-10 h-10 text-rose-500" />
                      <h3 className="font-bold text-foreground text-sm">
                        {language === "pt" ? "Erro no sistema de visão" : "Vision system error"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                        {errorMessage}
                      </p>
                      <Button
                        type="button"
                        onClick={startCamera}
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold border-white/10"
                      >
                        {language === "pt" ? "Tentar novamente" : "Try again"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-muted-foreground animate-pulse mb-1" />
                      <h3 className="font-bold text-foreground text-sm">
                        {language === "pt" ? "A câmara necessita de autorização" : "Camera requires authorization"}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                        {language === "pt"
                          ? "Pressione o botão abaixo para ativar a câmara em tempo real e detetar a postura do seu animal."
                          : "Press the button below to activate the camera in real time and detect your pet's posture."}
                      </p>
                      <Button
                        type="button"
                        onClick={startCamera}
                        className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 rounded-xl active-scale"
                      >
                        {language === "pt" ? "Ativar Câmara 📷" : "Enable Camera 📷"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info footer */}
      <div className="bg-secondary/25 border border-border/40 rounded-2xl p-3 text-center">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {language === "pt"
            ? "A IA do AnimalMind analisa as posturas corporais e correlaciona-as com sentimentos de relaxamento, angústia ou brincadeira."
            : "AnimalMind AI analyzes body postures and correlates them with feelings of relaxation, distress or play."}
        </p>
      </div>
    </div>
  );
}
