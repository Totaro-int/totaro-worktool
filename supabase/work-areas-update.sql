-- ============================================================
-- 사업영역 이름을 워크 허브 노드에 맞춰 정리
--   마케팅 에이전트 / e커머스 / 소싱 AI
-- Supabase 프로젝트 > SQL Editor 에 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
--
-- id 는 그대로 두고 표시 이름(name)만 바꿉니다 —
-- 기존 tasks/activities/documents 의 work_area_id 연결이 유지됩니다.
-- ============================================================

update public.work_areas set name = '마케팅 에이전트' where id = 'ai_agent';
update public.work_areas set name = 'e커머스'          where id = 'ai_branding';
update public.work_areas set name = '소싱 AI'          where id = 'b2b_sourcing';
