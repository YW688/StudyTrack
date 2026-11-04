import dayjs from "dayjs";

export function backupFileName(now = dayjs()): string {
  return `studytrack-backup-${now.format("YYYYMMDD-HHmm")}.json`;
}

export function downloadBackupFile(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  /* 立刻 revoke 会让下载请求拿不到 blob 而取消 留一拍交给浏览器 */
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
