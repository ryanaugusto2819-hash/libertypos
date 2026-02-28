import { useState, useRef } from "react";
import { Eye, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  url: string | null;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUploadCell({ url, onChange, label = "Comprovante" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onChange(objectUrl);
    toast.success(`${label} anexado!`);
    e.target.value = "";
  };

  if (!url) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Badge
          variant="secondary"
          className="status-pending cursor-pointer text-xs font-bold hover:opacity-80 transition-opacity inline-flex items-center gap-1.5"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          Pendente
        </Badge>
      </>
    );
  }

  return (
    <>
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
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-2">
            <img
              src={url}
              alt={label}
              className="max-h-[70vh] rounded-xl border-2 border-primary/20 object-contain"
            />
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
