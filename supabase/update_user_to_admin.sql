-- Update user role to admin
-- Replace the user_id with the actual user ID

UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE id = 'bb354ec1-058b-495c-8936-4ecdf6de14b6';

