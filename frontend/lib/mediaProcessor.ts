export const MEDIA_LIMITS_MB = {
  image: 5,
  video: 16,
  audio: 16,
  document: 100,
};

const HARMFUL_EXTENSIONS = [
  ".exe", ".msi", ".bat", ".cmd", ".sh", ".vbs", ".js", ".scr", ".pif", ".cpl", 
  ".wsf", ".jar", ".com", ".gadget", ".vb", ".vbe", ".jse", ".lnk", ".reg"
];

export function getMediaType(file: File): keyof typeof MEDIA_LIMITS_MB {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export async function processMedia(file: File): Promise<{
  file: File;
  mediaType: keyof typeof MEDIA_LIMITS_MB;
}> {
  // Security check: Reject executable/script files that could harm the platform or recipient
  const filename = file.name || "";
  const extIndex = filename.lastIndexOf(".");
  if (extIndex !== -1) {
    const ext = filename.substring(extIndex).toLowerCase();
    if (HARMFUL_EXTENSIONS.includes(ext)) {
      throw new Error("This file type is not allowed for security reasons.");
    }
  }

  const mediaType = getMediaType(file);
  const maxBytes = MEDIA_LIMITS_MB[mediaType] * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(
      `${mediaType.toUpperCase()} exceeds WhatsApp limit (${MEDIA_LIMITS_MB[mediaType]} MB)`
    );
  }

  return { file, mediaType };
}
