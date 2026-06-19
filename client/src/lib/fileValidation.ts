import { toast } from "sonner";

export const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/ogg",
  "audio/webm"
];

export const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg"
];

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

export const ALLOWED_BULLETIN_MIME = [
  ...ALLOWED_IMAGE_MIME,
  "application/pdf"
];

export const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function validateUploadedFile(
  file: File,
  type: "audio" | "video" | "image" | "bulletin",
  language: "pt" | "en" = "pt"
): boolean {
  let allowedMime: string[] = [];
  let maxSize = 0;
  let sizeLabel = "";

  if (type === "audio") {
    allowedMime = ALLOWED_AUDIO_MIME;
    maxSize = MAX_AUDIO_SIZE;
    sizeLabel = "50 MB";
  } else if (type === "video") {
    allowedMime = ALLOWED_VIDEO_MIME;
    maxSize = MAX_VIDEO_SIZE;
    sizeLabel = "200 MB";
  } else if (type === "image") {
    allowedMime = ALLOWED_IMAGE_MIME;
    maxSize = MAX_IMAGE_SIZE;
    sizeLabel = "5 MB";
  } else {
    allowedMime = ALLOWED_BULLETIN_MIME;
    maxSize = MAX_IMAGE_SIZE; // Bulletin also max 5MB
    sizeLabel = "5 MB";
  }

  const mimeType = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Extensions fallback
  const audioExtensions = ["mp3", "wav", "m4a", "aac", "ogg", "webm"];
  const videoExtensions = ["mp4", "mov", "webm", "ogg"];
  const imageExtensions = ["jpg", "jpeg", "png", "webp"];
  const bulletinExtensions = [...imageExtensions, "pdf"];

  let isExtensionValid = false;
  if (type === "audio") {
    isExtensionValid = audioExtensions.includes(ext);
  } else if (type === "video") {
    isExtensionValid = videoExtensions.includes(ext);
  } else if (type === "image") {
    isExtensionValid = imageExtensions.includes(ext);
  } else {
    isExtensionValid = bulletinExtensions.includes(ext);
  }

  // Check MIME type
  const isMimeValid = mimeType ? allowedMime.includes(mimeType) : false;

  if (!isMimeValid && !isExtensionValid) {
    const errorMsg =
      language === "pt"
        ? `Formato de ficheiro não suportado. Formatos aceites: ${
            type === "audio"
              ? ".mp3, .wav, .m4a, .aac, .ogg"
              : type === "video"
                ? ".mp4, .mov, .webm"
                : type === "image"
                  ? ".jpg, .jpeg, .png, .webp"
                  : ".jpg, .jpeg, .png, .webp, .pdf"
          }`
        : `Unsupported file format. Allowed formats: ${
            type === "audio"
              ? ".mp3, .wav, .m4a, .aac, .ogg"
              : type === "video"
                ? ".mp4, .mov, .webm"
                : type === "image"
                  ? ".jpg, .jpeg, .png, .webp"
                  : ".jpg, .jpeg, .png, .webp, .pdf"
          }`;
    toast.error(errorMsg);
    return false;
  }

  // Check file size
  if (file.size > maxSize) {
    const errorMsg =
      language === "pt"
        ? `Ficheiro demasiado grande. Tamanho máximo permitido: ${sizeLabel}`
        : `File is too large. Maximum size allowed: ${sizeLabel}`;
    toast.error(errorMsg);
    return false;
  }

  return true;
}
