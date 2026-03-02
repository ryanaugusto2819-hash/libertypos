import { useState, useRef } from "react";
import { Eye, Upload, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  url: string | null;
  onChange: (url: string) => void;
  label?: string;
}

function extractFilePath(publicUrl: string): string | null {
  const match = publicUrl.match(/order-attachments\/(.+)$/);
  return match ? match[1] : null;
}

export function ImageUploadCell({ url, onChange, label = "Comprovante" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${ext}`;
    const filePath = `uploads/${fileName}`;

    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("order-attachments")
        .upload(filePath, file);

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("order-attachments")
        .getPublicUrl(filePath);

      onChange(publicData.publicUrl);
      toast.success(`${label} salvo com sucesso!`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async () => {
    if (!url) return;
    const filePath = extractFilePath(url);
    if (!filePath) {
      toast.error("Caminho do arquivo inválido");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("order-attachments")
        .download(filePath);
      if (error) throw error;

      const blobLink = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobLink;
      a.download = filePath.split("/").pop() || "arquivo";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobLink);
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Erro ao baixar o arquivo");
    }
  };

  const openPreview = async () => {
    if (!url) return;
    const filePath = extractFilePath(url);
    if (!filePath) return;

    try {
      const { data, error } = await supabase.storage
        .from("order-attachments")
        .download(filePath);
      if (error) throw error;

      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const newBlobUrl = URL.createObjectURL(data);
      setBlobUrl(newBlobUrl);
      setPreviewOpen(true);
    } catch (err) {
      console.error("Preview error:", err);
      toast.error("Erro ao carregar pré-visualização");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Selecione uma imagem ou PDF válido");
      return;
    }

    await uploadFile(file);
    e.target.value = "";
  };

  const isPdf = url?.toLowerCase().endsWith(".pdf");

  if (!url) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
        {uploading ? (
          <Badge variant="secondary" className="status-pending text-xs font-bold inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enviando...
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="status-pending cursor-pointer text-xs font-bold hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Pendente
          </Badge>
        )}
      </>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="status-paid text-xs font-bold">
          Concluído
        </Badge>
        <button
          onClick={openPreview}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          title={`Visualizar ${label.toLowerCase()}`}
        >
          <Eye className="h-4 w-4 text-primary" />
        </button>
        <button
          onClick={downloadFile}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          title={`Baixar ${label.toLowerCase()}`}
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open);
        if (!open && blobUrl) {
          URL.revokeObjectURL(blobUrl);
          setBlobUrl(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-2">
            {blobUrl && isPdf ? (
              <iframe
                src={blobUrl}
                className="w-full h-[70vh] rounded-xl border-2 border-primary/20"
                title={label}
              />
            ) : blobUrl ? (
              <img
                src={blobUrl}
                alt={label}
                className="max-h-[70vh] rounded-xl border-2 border-primary/20 object-contain"
              />
            ) : (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => {
                onChange("");
                setPreviewOpen(false);
                toast.success(`${label} removido`);
              }}
            >
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
