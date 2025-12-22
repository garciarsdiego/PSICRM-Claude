import { format, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, CalendarIcon, CalendarDays, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarViewType = 'day' | 'month';

interface CalendarHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  viewType: CalendarViewType;
  onViewTypeChange: (viewType: CalendarViewType) => void;
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  viewType,
  onViewTypeChange,
}: CalendarHeaderProps) {
  const handlePrevious = () => {
    if (viewType === 'day') {
      onDateChange(subDays(currentDate, 1));
    } else {
      onDateChange(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewType === 'day') {
      onDateChange(addDays(currentDate, 1));
    } else {
      onDateChange(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getTitle = () => {
    if (viewType === 'day') {
      return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getTitle()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="outline" onClick={handleToday}>
          Hoje
        </Button>
      </div>

      <ToggleGroup 
        type="single" 
        value={viewType} 
        onValueChange={(value) => value && onViewTypeChange(value as CalendarViewType)}
        className="border rounded-lg"
      >
        <ToggleGroupItem value="day" aria-label="Visualização do dia" className="px-3">
          <CalendarDays className="h-4 w-4 mr-2" />
          Dia
        </ToggleGroupItem>
        <ToggleGroupItem value="month" aria-label="Visualização do mês" className="px-3">
          <LayoutGrid className="h-4 w-4 mr-2" />
          Mês
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
