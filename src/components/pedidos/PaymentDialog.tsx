import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  orderName: string;
  onConfirm: (orderId: string) => void;
}

export function PaymentDialog({ open, onOpenChange, orderId, orderName, onConfirm }: PaymentDialogProps) {
  const handleConfirm = () => {
    if (orderId) {
      onConfirm(orderId);
      toast.success(`Pagamento de ${orderName} registrado!`);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Confirmar pagamento do pedido de <strong>{orderName}</strong>?
          </p>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-sm text-muted-foreground">
              📎 Arraste um comprovante aqui ou clique para anexar
            </p>
            <p className="text-xs text-muted-foreground mt-1">(PDF ou imagem)</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Data e hora serão registradas automaticamente.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-success hover:bg-success/90 text-success-foreground">
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
