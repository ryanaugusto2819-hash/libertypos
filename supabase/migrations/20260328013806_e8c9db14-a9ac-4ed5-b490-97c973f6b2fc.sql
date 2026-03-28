ALTER TABLE public.webhook_config 
ADD COLUMN attendance_webhook_url text NOT NULL DEFAULT '',
ADD COLUMN attendance_webhook_active boolean NOT NULL DEFAULT false;