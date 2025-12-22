import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, User, Calendar, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SearchResult {
  id: string;
  type: 'patient' | 'session' | 'record';
  title: string;
  subtitle: string;
  route: string;
}

interface GlobalSearchProps {
  variant?: 'bar' | 'button';
  onOpen?: () => void;
}

export function GlobalSearch({ variant = 'bar', onOpen }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search patients
  const { data: patients = [] } = useQuery({
    queryKey: ['search-patients', profile?.user_id, searchTerm],
    queryFn: async () => {
      if (!profile?.user_id || !searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, email, phone')
        .eq('professional_id', profile.user_id)
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && searchTerm.length >= 2,
  });

  // Search sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['search-sessions', profile?.user_id, searchTerm],
    queryFn: async () => {
      if (!profile?.user_id || !searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from('sessions')
        .select('id, scheduled_at, patients(full_name)')
        .eq('professional_id', profile.user_id)
        .limit(5);
      if (error) throw error;
      // Filter in JS since we can't easily search by patient name in the query
      return data.filter((s: any) => 
        s.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    },
    enabled: !!profile?.user_id && searchTerm.length >= 2,
  });

  // Search records
  const { data: records = [] } = useQuery({
    queryKey: ['search-records', profile?.user_id, searchTerm],
    queryFn: async () => {
      if (!profile?.user_id || !searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, content, created_at, patients(full_name)')
        .eq('professional_id', profile.user_id)
        .or(`content.ilike.%${searchTerm}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.user_id && searchTerm.length >= 2,
  });

  const results: SearchResult[] = [
    ...patients.map((p) => ({
      id: p.id,
      type: 'patient' as const,
      title: p.full_name,
      subtitle: p.email || p.phone || 'Sem contato',
      route: '/patients',
    })),
    ...sessions.map((s: any) => ({
      id: s.id,
      type: 'session' as const,
      title: s.patients?.full_name || 'Sessão',
      subtitle: format(new Date(s.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      route: '/schedule',
    })),
    ...records.map((r: any) => ({
      id: r.id,
      type: 'record' as const,
      title: r.patients?.full_name || 'Prontuário',
      subtitle: r.content?.slice(0, 50) + '...' || 'Sem conteúdo',
      route: '/patients',
    })),
  ];

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearchTerm('');
    navigate(result.route);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'session':
        return <Calendar className="h-4 w-4" />;
      case 'record':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'patient':
        return 'Paciente';
      case 'session':
        return 'Sessão';
      case 'record':
        return 'Prontuário';
      default:
        return type;
    }
  };

  const handleOpen = () => {
    setOpen(true);
    onOpen?.();
  };

  // Button variant for sidebar
  if (variant === 'button') {
    return (
      <>
        <button
          onClick={handleOpen}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 w-full"
        >
          <Search className="w-5 h-5 flex-shrink-0" />
          <span>Buscar</span>
        </button>
        <SearchDialog
          open={open}
          onOpenChange={setOpen}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          results={results}
          patients={patients}
          sessions={sessions}
          records={records}
          onSelect={handleSelect}
          getIcon={getIcon}
          getTypeLabel={getTypeLabel}
        />
      </>
    );
  }

  // Bar variant for header
  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border transition-colors w-full max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar pacientes, sessões...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        results={results}
        patients={patients}
        sessions={sessions}
        records={records}
        onSelect={handleSelect}
        getIcon={getIcon}
        getTypeLabel={getTypeLabel}
      />

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar pacientes, sessões, prontuários..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          <CommandEmpty>
            {searchTerm.length < 2 
              ? 'Digite pelo menos 2 caracteres para buscar'
              : 'Nenhum resultado encontrado'
            }
          </CommandEmpty>
          {results.length > 0 && (
            <>
              {patients.length > 0 && (
                <CommandGroup heading="Pacientes">
                  {results
                    .filter((r) => r.type === 'patient')
                    .map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              {sessions.length > 0 && (
                <CommandGroup heading="Sessões">
                  {results
                    .filter((r) => r.type === 'session')
                    .map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              {records.length > 0 && (
                <CommandGroup heading="Prontuários">
                  {results
                    .filter((r) => r.type === 'record')
                    .map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {getIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(result.type)}
                        </Badge>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

// Extracted dialog component for reuse
interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  results: SearchResult[];
  patients: any[];
  sessions: any[];
  records: any[];
  onSelect: (result: SearchResult) => void;
  getIcon: (type: string) => React.ReactNode;
  getTypeLabel: (type: string) => string;
}

function SearchDialog({
  open,
  onOpenChange,
  searchTerm,
  onSearchChange,
  results,
  patients,
  sessions,
  records,
  onSelect,
  getIcon,
  getTypeLabel,
}: SearchDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar pacientes, sessões, prontuários..."
        value={searchTerm}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>
          {searchTerm.length < 2 
            ? 'Digite pelo menos 2 caracteres para buscar'
            : 'Nenhum resultado encontrado'
          }
        </CommandEmpty>
        {results.length > 0 && (
          <>
            {patients.length > 0 && (
              <CommandGroup heading="Pacientes">
                {results
                  .filter((r) => r.type === 'patient')
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => onSelect(result)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {sessions.length > 0 && (
              <CommandGroup heading="Sessões">
                {results
                  .filter((r) => r.type === 'session')
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => onSelect(result)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {records.length > 0 && (
              <CommandGroup heading="Prontuários">
                {results
                  .filter((r) => r.type === 'record')
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => onSelect(result)}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
