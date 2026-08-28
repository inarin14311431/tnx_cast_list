-- Restrict character image uploads at the Storage bucket level.
-- Keep the bucket public by design; only upload type/size constraints change here.

do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'character-images'
  ) then
    raise exception 'character-images bucket does not exist';
  end if;

  update storage.buckets
  set file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
  where id = 'character-images';
end
$$;
