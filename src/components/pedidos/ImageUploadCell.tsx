import { useState, useRef } from "react";
import { Eye, Upload, RefreshCw, Loader2 } from "lucide-react";
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

export function ImageUploadCell({ url, onChange, label = "Comprovante" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

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
          onClick={() => setPreviewOpen(true)}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          title={`Visualizar ${label.toLowerCase()}`}
        >
          <Eye className="h-4 w-4 text-primary" />
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          title={`Substituir ${label.toLowerCase()}`}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-2">
            {isPdf ? (
              <iframe
                src={url}
                className="w-full h-[70vh] rounded-xl border-2 border-primary/20"
                title={label}
              />
            ) : (
              <img
                src={url}
                alt={label}
                className="max-h-[70vh] rounded-xl border-2 border-primary/20 object-contain"
              />
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
