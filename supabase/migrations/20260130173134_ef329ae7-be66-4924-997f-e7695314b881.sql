-- Criar tabela de permissões específicas por módulo
CREATE TABLE public.user_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    permission text NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, permission)
);

-- Habilitar RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Função para verificar se é master
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master'
  )
$$;

-- Função para verificar permissão específica (masters têm todas as permissões)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_master(_user_id) 
    OR EXISTS (
      SELECT 1
      FROM public.user_permissions
      WHERE user_id = _user_id
        AND permission = _permission
    )
$$;

-- Políticas RLS para user_permissions (apenas masters podem gerenciar)
CREATE POLICY "Masters can view all permissions"
ON public.user_permissions
FOR SELECT
USING (is_master(auth.uid()));

CREATE POLICY "Masters can insert permissions"
ON public.user_permissions
FOR INSERT
WITH CHECK (is_master(auth.uid()));

CREATE POLICY "Masters can update permissions"
ON public.user_permissions
FOR UPDATE
USING (is_master(auth.uid()));

CREATE POLICY "Masters can delete permissions"
ON public.user_permissions
FOR DELETE
USING (is_master(auth.uid()));

-- Atualizar políticas do payments para usar permissão 'financial'
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Financial access can view all payments"
ON public.payments
FOR SELECT
USING (has_permission(auth.uid(), 'financial'));

CREATE POLICY "Financial access can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (has_permission(auth.uid(), 'financial'));

CREATE POLICY "Financial access can update payments"
ON public.payments
FOR UPDATE
USING (has_permission(auth.uid(), 'financial'));

CREATE POLICY "Financial access can delete payments"
ON public.payments
FOR DELETE
USING (has_permission(auth.uid(), 'financial'));

-- Atualizar o usuário lfsmed@hotmail.com para master
UPDATE public.user_roles 
SET role = 'master' 
WHERE user_id = '405c81a7-342f-497e-a77b-311635e28d21';