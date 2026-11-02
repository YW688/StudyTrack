const RASTER_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;
const OUTPUT_WIDTH = 360;
const OUTPUT_HEIGHT = 480;
const OUTPUT_QUALITY = 0.85;

export type ResumePhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; message: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("read"));
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode"));
    image.src = src;
  });
}

/** 按 3:4 证件照比例居中裁剪，只在本机转码，不上传 */
export async function createResumePhotoFromFile(
  file: File,
): Promise<ResumePhotoResult> {
  if (!RASTER_TYPES.has(file.type)) {
    return { ok: false, message: "只支持 PNG JPEG WebP GIF 图片" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: "图片超过 8MB 换一张小一点的" };
  }

  let image: HTMLImageElement;
  try {
    image = await loadImage(await readAsDataUrl(file));
  } catch {
    return { ok: false, message: "这张图片读不出来 换一张试试" };
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    return { ok: false, message: "这张图片是空的 换一张试试" };
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: false, message: "当前浏览器不支持图片裁剪" };
  }

  const targetRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  let sw = image.naturalWidth;
  let sh = image.naturalHeight;
  if (sourceRatio > targetRatio) sw = sh * targetRatio;
  else sh = sw / targetRatio;
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", OUTPUT_QUALITY) };
}
