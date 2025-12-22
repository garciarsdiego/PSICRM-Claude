-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('professional', 'patient');

-- Enum para status de pagamento
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');

-- Enum para status de sessão
CREATE TYPE public.session_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- Enum para categorias de despesa
CREATE TYPE public.expense_category AS ENUM ('rent', 'utilities', 'supplies', 'software', 'marketing', 'education', 'other');

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Tabela de perfis (profissionais)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    crp TEXT,
    specialty TEXT,
    bio TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    session_duration INTEGER DEFAULT 50,
    session_price DECIMAL(10,2) DEFAULT 0,
    avatar_url TEXT,
    language TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Tabela de pacientes
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    birth_date DATE,
    cpf TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    clinical_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    session_price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Tabela de sessões
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 50,
    status session_status DEFAULT 'scheduled',
    price DECIMAL(10,2) NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    google_event_id TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Tabela de prontuários
CREATE TABLE public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    audio_transcription TEXT,
    ai_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- Tabela de despesas
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category expense_category DEFAULT 'other',
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Tabela de mensagens (chat)
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Tabela de configurações de email
CREATE TABLE public.email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 1,
    payment_reminder_enabled BOOLEAN DEFAULT true,
    payment_reminder_template TEXT DEFAULT 'Olá {{nome}}, você tem {{sessoes}} sessão(ões) pendente(s) no valor de R$ {{valor}}.',
    session_reminder_template TEXT DEFAULT 'Olá {{nome}}, lembrete: sua sessão está agendada para {{data}} às {{hora}}.',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User roles: usuários podem ver seus próprios roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Profiles: profissionais podem gerenciar seus próprios perfis
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Patients: profissionais gerenciam seus pacientes, pacientes veem seus próprios dados
CREATE POLICY "Professionals can manage their patients" ON public.patients
    FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Patients can view their own data" ON public.patients
    FOR SELECT USING (auth.uid() = user_id);

-- Sessions: profissionais gerenciam, pacientes veem suas sessões
CREATE POLICY "Professionals can manage their sessions" ON public.sessions
    FOR ALL USING (auth.uid() = professional_id);

CREATE POLICY "Patients can view their sessions" ON public.sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.patients 
            WHERE patients.id = sessions.patient_id 
            AND patients.user_id = auth.uid()
        )
    );

-- Medical records: apenas profissionais
CREATE POLICY "Professionals can manage their records" ON public.medical_records
    FOR ALL USING (auth.uid() = professional_id);

-- Expenses: apenas profissionais
CREATE POLICY "Professionals can manage their expenses" ON public.expenses
    FOR ALL USING (auth.uid() = professional_id);

-- Messages: participantes podem ver/enviar
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read" ON public.messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Email settings: apenas profissionais
CREATE POLICY "Professionals can manage email settings" ON public.email_settings
    FOR ALL USING (auth.uid() = professional_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
    BEFORE UPDATE ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at
    BEFORE UPDATE ON public.email_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente ao signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'professional'));
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;