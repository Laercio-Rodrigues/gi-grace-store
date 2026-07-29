-- Hide reviewer identity from public reads
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, product_id, rating, comment, created_at) ON public.reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
-- Note: the column-restricted grant above is overridden by full grant for authenticated,
-- so we take a different approach: keep table grants, but restrict via a view for public consumption.
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (id, product_id, rating, comment, created_at) ON public.reviews TO anon;

-- Also hide user_id from authenticated column-level (they can still see their own via app logic if needed)
REVOKE SELECT ON public.reviews FROM authenticated;
GRANT SELECT (id, product_id, rating, comment, created_at, user_id) ON public.reviews TO authenticated;
-- Actually authenticated users legitimately may need user_id to know if it's their own review.
-- Keep user_id for authenticated but hide from anon (done above).

-- Lock down has_role from anonymous callers (authenticated still needs EXECUTE for RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;