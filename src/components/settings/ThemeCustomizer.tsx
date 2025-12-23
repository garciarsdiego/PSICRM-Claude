import { useThemeCustomization } from '@/contexts/ThemeCustomizationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, RotateCcw, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

// Predefined color palettes (HSL values)
const PRIMARY_COLORS = [
    { name: 'Roxo (Padrão)', value: '262 60% 55%', class: 'bg-[#8944d4]' },
    { name: 'Azul', value: '221 83% 53%', class: 'bg-[#3b82f6]' },
    { name: 'Verde', value: '142 71% 45%', class: 'bg-[#22c55e]' },
    { name: 'Rosa', value: '330 81% 60%', class: 'bg-[#ec4899]' },
    { name: 'Laranja', value: '24 94% 50%', class: 'bg-[#f97316]' },
    { name: 'Vermelho', value: '0 84% 60%', class: 'bg-[#ef4444]' },
    { name: 'Cinza', value: '220 9% 46%', class: 'bg-[#6b7280]' },
    { name: 'Preto', value: '0 0% 0%', class: 'bg-[#000000]' },
];
// Background colors
const BACKGROUND_COLORS = [
    { name: 'Padrão (Sistema)', value: undefined },
    { name: 'Branco Puro', value: '0 0% 100%' },
    { name: 'Cinza Suave', value: '210 40% 98%' },
    { name: 'Creme', value: '40 20% 97%' },
    { name: 'Escuro (Profundo)', value: '240 10% 4%' },
    { name: 'Azul Noturno', value: '222 47% 11%' },
    { name: 'Cinza Escuro', value: '220 9% 46%' },
];

// Text colors
const TEXT_COLORS = [
    { name: 'Padrão (Sistema)', value: undefined },
    { name: 'Preto Puro', value: '0 0% 0%' },
    { name: 'Cinza Escuro', value: '222 47% 11%' },
    { name: 'Cinza Neutro', value: '215 16% 47%' },
    { name: 'Branco', value: '0 0% 100%' },
    { name: 'Branco Suave', value: '210 40% 98%' },
];

export function ThemeCustomizer() {
    const { colors, setPrimaryColor, setBackgroundColor, setTextColor, resetTheme } = useThemeCustomization();

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Cores do Sistema
                    </CardTitle>
                    <CardDescription>
                        Personalize a aparência do sistema escolhendo sua cor de destaque favorita.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-base">Cor Principal</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                            {PRIMARY_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    onClick={() => setPrimaryColor(color.value)}
                                    className={cn(
                                        "group relative flex h-12 w-full items-center justify-center rounded-lg border-2 transition-all hover:scale-105 focus:outline-none ring-offset-background",
                                        colors.primary === color.value
                                            ? "border-primary ring-2 ring-primary ring-offset-2"
                                            : "border-transparent hover:border-muted-foreground/30"
                                    )}
                                >
                                    <span
                                        className={cn("absolute inset-1 rounded-md", color.class)}
                                    />
                                    {colors.primary === color.value && (
                                        <span className="z-10 flex items-center justify-center rounded-full bg-white/20 p-1">
                                            <Check className="h-4 w-4 text-white drop-shadow-md" />
                                        </span>
                                    )}
                                    <span className="sr-only">{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-base">Cor de Fundo</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                            {BACKGROUND_COLORS.map((color) => (
                                <button
                                    key={color.value || 'default'}
                                    onClick={() => setBackgroundColor(color.value)}
                                    className={cn(
                                        "group relative flex h-12 w-full items-center justify-center rounded-lg border-2 transition-all hover:scale-105 focus:outline-none ring-offset-background",
                                        colors.backgroundColor === color.value
                                            ? "border-primary ring-2 ring-primary ring-offset-2"
                                            : "border-muted hover:border-muted-foreground/30",
                                        "overflow-hidden"
                                    )}
                                    style={color.value ? { backgroundColor: `hsl(${color.value})` } : {}}
                                >
                                    {!color.value && <div className="absolute inset-0 bg-background flex items-center justify-center text-xs text-muted-foreground">Padrão</div>}
                                    {colors.backgroundColor === color.value && (
                                        <span className="z-10 flex items-center justify-center rounded-full bg-white/20 p-1">
                                            <Check className={cn("h-4 w-4 drop-shadow-md", color.value?.startsWith('0') || color.value?.startsWith('240') ? "text-white" : "text-black")} />
                                        </span>
                                    )}
                                    <span className="sr-only">{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <Label className="text-base">Cor do Texto</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                            {TEXT_COLORS.map((color) => (
                                <button
                                    key={color.value || 'default'}
                                    onClick={() => setTextColor(color.value)}
                                    className={cn(
                                        "group relative flex h-12 w-full items-center justify-center rounded-lg border-2 transition-all hover:scale-105 focus:outline-none ring-offset-background",
                                        colors.textColor === color.value
                                            ? "border-primary ring-2 ring-primary ring-offset-2"
                                            : "border-muted hover:border-muted-foreground/30",
                                        "overflow-hidden"
                                    )}
                                    style={color.value ? { backgroundColor: `hsl(${color.value})` } : {}}
                                >
                                    {!color.value && <div className="absolute inset-0 bg-background flex items-center justify-center text-xs text-muted-foreground">Padrão</div>}
                                    {colors.textColor === color.value && (
                                        <span className="z-10 flex items-center justify-center rounded-full bg-white/20 p-1">
                                            <Check className="h-4 w-4 text-white drop-shadow-md mix-blend-difference" />
                                        </span>
                                    )}
                                    <span className="sr-only">{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="outline" onClick={resetTheme} className="text-muted-foreground">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restaurar Padrão
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg">Visualização</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2">
                            <Button>Botão Principal</Button>
                            <Button variant="secondary">Secundário</Button>
                            <Button variant="outline">Outline</Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                A
                            </div>
                            <div className="space-y-1">
                                <div className="h-2 w-24 bg-primary/20 rounded"></div>
                                <div className="h-2 w-16 bg-primary/10 rounded"></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
