begin;

-- キャスト画像は次の構成で保存される。
-- character-images/<auth user id>/<character public id>/<timestamp>.webp
--
-- ログインユーザー本人が所有し、自分のUser IDフォルダ内にある
-- character-imagesバケットのオブジェクトだけ削除を許可する。

drop policy if exists character_images_delete_own
  on storage.objects;

create policy character_images_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'character-images'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
