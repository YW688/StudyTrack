const RASTER_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024;
const OUTPUT_SIZE = 256;
const OUTPUT_QUALITY = 0.86;
const BACKDROP = "#f7f5f0";

export type AvatarResult =
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

export async function createAvatarFromFile(file: File): Promise<AvatarResult> {
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

  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) {
    return { ok: false, message: "这张图片是空的 换一张试试" };
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: false, message: "当前浏览器不支持图片裁剪" };
  }

  const sx = (image.naturalWidth - side) / 2;
  const sy = (image.naturalHeight - side) / 2;
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", OUTPUT_QUALITY) };
}
