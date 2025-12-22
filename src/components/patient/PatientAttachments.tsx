import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  File,
  Image,
  FileArchive,
  Paperclip,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PatientAttachmentsProps {
  patientId: string;
  professionalId: string;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return FileArchive;
  return File;
};

export function PatientAttachments({
  patientId,
  professionalId,
  patientName,
  isOpen,
  onClose,
}: PatientAttachmentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);

  // Fetch attachments
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['patient-attachments', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_attachments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: isOpen && !!patientId,
  });

  // Upload file
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande. Máximo 10MB.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${professionalId}/${patientId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('patient-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata
      const { error: dbError } = await supabase
        .from('patient_attachments')
        .insert({
          patient_id: patientId,
          professional_id: professionalId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          description: description || null,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ['patient-attachments', patientId] });
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'Arquivo anexado com sucesso!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao anexar arquivo', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  // Download file
  const downloadFile = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' });
    }
  };

  // Delete attachment
  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) throw new Error('Anexo não encontrado');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('patient-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('patient_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-attachments', patientId] });
      setDeleteAttachmentId(null);
      toast({ title: 'Anexo excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir anexo', variant: 'destructive' });
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Anexos - {patientName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Section */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Adicionar Anexo</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Descrição (opcional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Anexar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: PDF, imagens, documentos. Máximo 10MB.
              </p>
            </div>

            {/* Attachments List */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <span className="text-sm font-medium">
                  {attachments.length} {attachments.length === 1 ? 'anexo' : 'anexos'}
                </span>
              </div>
              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Paperclip className="h-8 w-8 mb-2" />
                    <p className="text-sm">Nenhum anexo encontrado</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {attachments.map((attachment) => {
                      const FileIcon = getFileIcon(attachment.file_type);
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="p-2 bg-muted rounded">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {attachment.file_name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatFileSize(attachment.file_size)}</span>
                                <span>•</span>
                                <span>
                                  {format(new Date(attachment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              {attachment.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {attachment.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadFile(attachment)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteAttachmentId(attachment.id)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAttachmentId} onOpenChange={() => setDeleteAttachmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteAttachmentId && deleteAttachment.mutate(deleteAttachmentId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
