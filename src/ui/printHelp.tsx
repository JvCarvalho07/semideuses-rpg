import { useEffect, useRef, useState } from "react";
import type { PrintFormat } from "./config";

/** Que tipo de celular (ou navegador dentro de um app) está abrindo a ficha. */
export type PrintDevice = "android" | "ios" | "in-app" | "desktop";

export function printDevice(userAgent = navigator.userAgent, coarse = window.matchMedia("(pointer: coarse)").matches): PrintDevice {
  // Navegadores embutidos (WhatsApp, Instagram, Discord…) não salvam PDF.
  if (/FBAN|FBAV|Instagram|WhatsApp|Line\/|Telegram|Discord|Snapchat|TikTok|; wv\)/i.test(userAgent)) return "in-app";
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && coarse)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return coarse ? "android" : "desktop";
}

const FORMATS: Array<{ value: PrintFormat; label: string; hint: string }> = [
  { value: "A4", label: "A4", hint: "folha comum" },
  { value: "A5", label: "A5", hint: "metade, para fichário" },
  { value: "A3", label: "A3", hint: "grande" },
];

const STEPS: Record<"android" | "ios", string[]> = {
  android: [
    "Toque em Gerar PDF, aqui embaixo.",
    "Na tela que abrir, toque no nome da impressora, lá em cima, e escolha Salvar como PDF.",
    "Toque no botão redondo PDF e escolha onde guardar.",
  ],
  ios: [
    "Toque em Gerar PDF, aqui embaixo.",
    "Na tela de impressão, toque no botão Compartilhar (quadrado com a seta para cima).",
    "Escolha Salvar em Arquivos.",
  ],
};

/** No celular, explica o caminho até o PDF antes de abrir a tela de impressão do sistema. */
export function PrintHelp({
  open,
  device,
  format,
  onFormat,
  onPrint,
  onExport,
  onClose,
}: {
  open: boolean;
  device: PrintDevice;
  format: PrintFormat;
  onFormat: (format: PrintFormat) => void;
  onPrint: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) setCopied(false);
  }, [open]);

  const url = window.location.href;
  const chromeIntent = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copie o link da ficha:", url);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="print-help"
      aria-labelledby="print-help-title"
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="print-help-inner">
        <h2 id="print-help-title">Salvar a ficha em PDF</h2>
        {device === "in-app" ? (
          <>
            <p className="print-help-lead">O navegador de dentro do app (WhatsApp, Discord, Instagram) não salva PDF. A ficha fica guardada só neste navegador, então leve ela junto:</p>
            <ol className="print-help-steps">
              <li>Toque em Baixar ficha (JSON).</li>
              <li>Abra o site no Chrome ou no Safari.</li>
              <li>Toque em Importar, escolha o arquivo baixado e depois em PDF.</li>
            </ol>
            <div className="print-help-actions">
              <button type="button" className="print-help-primary" onClick={onExport}>Baixar ficha (JSON)</button>
              {/Android/i.test(navigator.userAgent) ? <a href={chromeIntent}>Abrir no Chrome</a> : <button type="button" onClick={copy}>{copied ? "Link copiado" : "Copiar link"}</button>}
              <button type="button" onClick={onClose}>Fechar</button>
            </div>
          </>
        ) : (
          <>
            <fieldset className="print-help-formats">
              <legend>Tamanho da folha</legend>
              {FORMATS.map((item) => (
                <label key={item.value} className={item.value === format ? "is-on" : ""}>
                  <input type="radio" name="print-format" value={item.value} checked={item.value === format} onChange={() => onFormat(item.value)} />
                  <b>{item.label}</b>
                  <small>{item.hint}</small>
                </label>
              ))}
            </fieldset>
            <ol className="print-help-steps">
              {STEPS[device === "ios" ? "ios" : "android"].map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="print-help-actions">
              <button type="button" className="print-help-primary" onClick={onPrint}>Gerar PDF</button>
              <button type="button" onClick={onClose}>Agora não</button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
