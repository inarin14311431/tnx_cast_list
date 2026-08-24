-- Final idempotent cleanup for legacy outfit compatibility data.
-- Current editors/importers normalize legacy aliases at the boundary and do not emit them.

-- Promote legacy combined armor defense into canonical S/P/I only when structured values are absent.
update public.character_outfits
set ofc_details = jsonb_set(
                    jsonb_set(
                      jsonb_set(coalesce(ofc_details,'{}'::jsonb), '{defense_s}', to_jsonb(trim(split_part(defense,'/',1))), true),
                      '{defense_p}', to_jsonb(trim(split_part(defense,'/',2))), true
                    ),
                    '{defense_i}', to_jsonb(trim(split_part(defense,'/',3))), true
                  )
where category='armor'
  and nullif(trim(coalesce(defense,'')),'') is not null
  and trim(coalesce(defense,'')) <> '//'
  and coalesce(ofc_details->>'defense_s','') = ''
  and coalesce(ofc_details->>'defense_p','') = ''
  and coalesce(ofc_details->>'defense_i','') = '';

-- Armor no longer persists the combined base defense value.
update public.character_outfits
set defense = ''
where category='armor'
  and nullif(trim(coalesce(defense,'')),'') is not null;

-- Legacy OFC aliases are read-only input compatibility and must not remain in current data.
update public.character_outfits
set ofc_details = coalesce(ofc_details,'{}'::jsonb) - 'control_value' - 'cs_value' - 'mundane_modifier'
where ofc_details ?| array['control_value','cs_value','mundane_modifier'];
