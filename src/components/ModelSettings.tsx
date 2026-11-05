import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PROVIDER_PRESETS,
  clearAiConfig,
  presetOf,
  saveAiConfig,
  type ProviderPresetId,
} from "../ai/config";
import { useAiConfig } from "../ai/useAiConfig";
import { activeTransport, testConnection } from "../ai/client";
import { FloatField, FloatSelect } from "./FloatField";

const BTN =
  "border-rule hover:bg-ink/[0.03] inline-flex min-h-11 items-center justify-center rounded-lg border bg-surface px-3 text-xs text-ink-2 disabled:cursor-not-allowed disabled:opacity-40";
const BTN_PRIMARY =
  "bg-ink text-paper inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40";

interface Notice {
  tone: "ok" | "error";
  text: string;
}

export default function ModelSettings() {
  const config = useAiConfig();
  const transport = activeTransport();
  const [open, setOpen] = useState(false);

  const summary =
    transport === "byok"
      ? `已接入 ${presetOf(config?.preset ?? "custom").label}`
      : transport === "proxy"
        ? "已接入 构建期代理"
        : "未接入 走本机原文兜底";

  return (
    <div className="app-island-model border-rule mt-2 flex items-center justify-between gap-2 border-t pt-2">
      <p className="text-micro leading-5 text-ink-3">
        <span className="font-mono tracking-[0.14em] text-ink-4">模型接入</span>
        <span className="mt-0.5 block">{summary}</span>
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={BTN}
        aria-haspopup="dialog"
      >
        {transport === "none" ? "填 Key" : "设置"}
      </button>
      {open && <ModelDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function ModelDialog({ onClose }: { onClose: () => void }) {
  const config = useAiConfig();
  const transport = activeTransport();
  const fallback = presetOf("bailian");
  const [preset, setPreset] = useState<ProviderPresetId>(
    config?.preset ?? "bailian",
  );
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? fallback.baseUrl);
  const [apiKey, setApiKey] = useState(config?.apiKey ?? "");
  const [textModel, setTextModel] = useState(
    config ? config.textModel : fallback.textModel,
  );
  const [visionModel, setVisionModel] = useState(
    config ? config.visionModel : fallback.visionModel,
  );
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const firstRef = useRef<HTMLInputElement | null>(null);

  const canSave =
    baseUrl.trim().length > 0 &&
    apiKey.trim().length > 0 &&
    textModel.trim().length > 0;
  const hasKey = Boolean(config?.apiKey);

  useEffect(() => {
    const timer = window.setTimeout(() => firstRef.current?.focus(), 50);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function applyPreset(id: string) {
    const next = id as ProviderPresetId;
    const item = presetOf(next);
    setPreset(next);
    if (next !== "custom") {
      setBaseUrl(item.baseUrl);
      setTextModel(item.textModel);
      setVisionModel(item.visionModel);
    }
    setNotice(null);
  }

  function persist(): boolean {
    const result = saveAiConfig({
      preset,
      baseUrl,
      apiKey,
      textModel,
      visionModel,
    });
    setNotice({ tone: result.ok ? "ok" : "error", text: result.message });
    return result.ok;
  }

  function handleSave() {
    if (persist()) onClose();
  }

  function handleClear() {
    clearAiConfig();
    setApiKey("");
    setNotice({ tone: "ok", text: "已删除本机 Key 与接入地址" });
  }

  async function handleTest() {
    if (canSave && !persist()) return;
    setTesting(true);
    const result = await testConnection();
    setNotice({ tone: result.ok ? "ok" : "error", text: result.message });
    setTesting(false);
  }

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="bg-ink/35 fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-settings-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface sm:rounded-xl"
      >
        <header className="border-rule sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-surface px-4 py-3 sm:px-5">
          <div>
            <p className="font-mono text-micro tracking-[0.16em] text-ink-3">
              模型接入
            </p>
            <h2
              id="model-settings-title"
              className="mt-1 text-base font-medium tracking-tight"
            >
              填你自己的 Key 才用真模型 不填也能走完全部流程
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭模型接入"
            className="hover:bg-ink/[0.04] -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl text-ink-3"
          >
            ×
          </button>
        </header>

        <div className="px-4 py-4 sm:px-5">
          <p className="font-mono text-micro tracking-[0.14em] text-ink-4">
            {transport === "byok"
              ? `当前 已接入 ${presetOf(config?.preset ?? "custom").label} 浏览器直连`
              : transport === "proxy"
                ? "当前 已接入 构建期代理"
                : "当前 未接入 全部走本机原文兜底"}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FloatSelect
                id="ai-preset"
                label="服务商"
                value={preset}
                onChange={applyPreset}
                options={PROVIDER_PRESETS.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            </div>
            <div className="sm:col-span-2">
              <FloatField
                id="ai-base-url"
                label="接入地址"
                type="url"
                value={baseUrl}
                onChange={setBaseUrl}
                maxLength={300}
                required
                inputRef={(node) => {
                  firstRef.current = node;
                }}
                hint="填到 /v1 即可 末尾的 /chat/completions 会自动补"
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <FloatField
                    id="ai-key"
                    label="API-KEY"
                    type={reveal ? "text" : "password"}
                    value={apiKey}
                    onChange={setApiKey}
                    maxLength={200}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setReveal((value) => !value)}
                  aria-pressed={reveal}
                  className={`${BTN} shrink-0`}
                >
                  {reveal ? "隐藏" : "显示"}
                </button>
              </div>
            </div>
            <FloatField
              id="ai-text-model"
              label="文本模型"
              value={textModel}
              onChange={setTextModel}
              maxLength={80}
            />
            <FloatField
              id="ai-vision-model"
              label="视觉模型"
              value={visionModel}
              onChange={setVisionModel}
              maxLength={80}
            />
          </div>

          <p className="text-ink-3 mt-2 text-micro leading-5">
            {presetOf(preset).hint}
          </p>
          <p className="text-ink-4 mt-1 text-micro leading-5">
            模型名以控制台列出的为准 视觉留空即关闭作业截图解析
          </p>

          {notice && (
            <p
              role="status"
              aria-live="polite"
              className={[
                "mt-3 rounded-lg border-l-2 px-3 py-2 text-xs leading-5",
                notice.tone === "error"
                  ? "border-amber/50 bg-amber/[0.07] text-ink-2"
                  : "border-rule bg-surface text-ink-2",
              ].join(" ")}
            >
              {notice.text}
            </p>
          )}

          <div className="border-rule mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="max-w-xs text-micro leading-5 text-ink-4">
              Key 只留这台浏览器 不进导出备份 不发给学径的服务器
              请求直连你填的服务商 清除本机数据会一并删掉
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {hasKey && (
                <button type="button" onClick={handleClear} className={BTN}>
                  删除 Key
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleTest()}
                disabled={(!hasKey && !canSave) || testing}
                className={BTN}
              >
                {testing ? "测试中" : "测试连通"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || testing}
                className={BTN_PRIMARY}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
