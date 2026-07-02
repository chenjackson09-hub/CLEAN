-- ============================================================================
-- 0000_base_schema.sql
--
-- Base schema for the Clean marketplace, captured from the live database with
-- `pg_dump --schema-only -n public` (Postgres 17). This is the schema the
-- incremental migrations 0001-0009 were built ON TOP of, but it already
-- reflects ALL of them (it was dumped from the current DB), so on a fresh
-- project you run THIS FILE INSTEAD OF 0001-0009, not in addition.
--
-- Cleaned for the Supabase SQL Editor:
--   * removed pg_dump's psql-only \restrict / \unrestrict lines
--   * removed `CREATE SCHEMA public` (already exists on a fresh project)
--   * added the postgis extension (cleaners.location is a geography column),
--     installed into `public` to match the dumped `public.geography` type
--
-- Made IDEMPOTENT so replaying this file against a database that ALREADY has
-- the schema is a no-op instead of an error: CREATE TYPE is wrapped in a
-- duplicate_object-swallowing DO block, CREATE TABLE -> CREATE TABLE IF NOT
-- EXISTS, CREATE FUNCTION -> CREATE OR REPLACE FUNCTION, each ADD CONSTRAINT is
-- wrapped in a DO block, and each policy is DROP-IF-EXISTS'd before re-create.
-- This is what lets Supabase's Preview/Branching check (which replays the whole
-- migrations/ folder in order) run without "type ... already exists" (42710)
-- and friends. The manual "run once on a fresh project" workflow is unchanged.
--
-- Still required AFTER this file (not contained here):
--   * the auth trigger on auth.users  -> see 0000b_auth_trigger.sql
--   * storage buckets + policies      -> see 0000c_storage.sql
-- ============================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Ubuntu 17.9-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- PostGIS: required by cleaners.location (geography). Installed into
-- public so the dumped `public.geography(Point,4326)` type resolves.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    CREATE TYPE public.application_status AS ENUM (
        'pending',
        'approved',
        'rejected',
        'needs_info'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
        'pending',
        'accepted',
        'declined',
        'completed',
        'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_status; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    CREATE TYPE public.cleaner_status AS ENUM (
        'pending',
        'approved',
        'rejected',
        'suspended'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: service_type; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    CREATE TYPE public.service_type AS ENUM (
        'residential',
        'commercial'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
        'customer',
        'cleaner',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(meta->>'role', 'customer');
begin
  insert into public.profiles (id, role, full_name, phone)
  values (new.id, v_role::user_role, meta->>'full_name', meta->>'phone')
  on conflict (id) do nothing;

  if v_role = 'customer' then
    insert into public.customers (id, bio, address, lat, lng, preferred_service_type)
    values (
      new.id,
      meta->>'bio',
      meta->>'address',
      nullif(meta->>'lat', '')::float8,
      nullif(meta->>'lng', '')::float8,
      nullif(meta->>'preferred_service_type', '')::service_type
    )
    on conflict (id) do nothing;

  elsif v_role = 'cleaner' then
    insert into public.cleaners (
      id, bio, service_types, hourly_rate, years_experience, languages, status, address
    )
    values (
      new.id,
      meta->>'bio',
      coalesce(array(select jsonb_array_elements_text(meta->'service_types')), '{}'),
      nullif(meta->>'hourly_rate', '')::numeric,
      nullif(meta->>'years_experience', '')::int,
      coalesce(array(select jsonb_array_elements_text(meta->'languages')), '{}'),
      'pending',
      meta->>'address'
    )
    on conflict (id) do nothing;

    insert into public.cleaner_applications (cleaner_id, status, submitted_at)
    select new.id, 'pending', now()
    where not exists (
      select 1 from public.cleaner_applications where cleaner_id = new.id
    );
  end if;

  return new;
end;
$$;


-- NOTE: public.rls_auto_enable() is intentionally OMITTED here.
-- It is a Supabase-managed function created by the project's "Enable automatic
-- RLS" setting. The original dump carried a copy, but recreating it collides
-- with Supabase's own ("function already exists with same argument types"), so
-- we let Supabase own it.


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_action_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_action_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    action text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    cleaner_id uuid,
    service_type public.service_type NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_start time without time zone NOT NULL,
    duration_hours numeric(4,2) NOT NULL,
    address text NOT NULL,
    notes text,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    response_deadline timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    cleaner_modified boolean DEFAULT false NOT NULL,
    cleaner_ack_cancelled boolean DEFAULT false NOT NULL,
    customer_ack_inactive boolean DEFAULT false NOT NULL,
    duration_flexible boolean DEFAULT false NOT NULL
);


--
-- Name: cleaner_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaner_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid,
    id_document_url text,
    status public.application_status DEFAULT 'pending'::public.application_status,
    admin_notes text,
    submitted_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid
);


--
-- Name: cleaner_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaner_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid,
    day_of_week integer,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    date date,
    CONSTRAINT cleaner_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: cleaner_gallery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaner_gallery (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid NOT NULL,
    photo_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: cleaner_weekly_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaner_weekly_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT cleaner_weekly_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT weekly_end_after_start CHECK ((end_time > start_time))
);


--
-- Name: cleaners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.cleaners (
    id uuid NOT NULL,
    bio text,
    service_types text[],
    hourly_rate numeric(6,2),
    location public.geography(Point,4326),
    service_radius_km integer DEFAULT 10,
    status public.cleaner_status DEFAULT 'pending'::public.cleaner_status,
    years_experience integer,
    languages text[],
    address text,
    admin_notes text
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL,
    bio text,
    address text,
    lat double precision,
    lng double precision,
    preferred_service_type public.service_type,
    admin_notes text,
    num_rooms integer,
    pet_types text[] DEFAULT '{}'::text[] NOT NULL,
    num_pets integer,
    num_kids_under_15 integer,
    num_people integer,
    house_size_sqm integer,
    dwelling_type text,
    floor integer,
    CONSTRAINT customers_dwelling_type_check CHECK (((dwelling_type IS NULL) OR (dwelling_type = ANY (ARRAY['apartment'::text, 'house'::text])))),
    CONSTRAINT customers_pet_types_check CHECK ((pet_types <@ ARRAY['dog'::text, 'cat'::text, 'other'::text]))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    full_name text,
    phone text,
    role public.user_role NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_action_log admin_action_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.admin_action_log
        ADD CONSTRAINT admin_action_log_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.bookings
        ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_applications cleaner_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_applications
        ADD CONSTRAINT cleaner_applications_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_availability cleaner_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_availability
        ADD CONSTRAINT cleaner_availability_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_gallery cleaner_gallery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_gallery
        ADD CONSTRAINT cleaner_gallery_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_weekly_availability cleaner_weekly_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_weekly_availability
        ADD CONSTRAINT cleaner_weekly_availability_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaners cleaners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaners
        ADD CONSTRAINT cleaners_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.customers
        ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.profiles
        ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: admin_action_log admin_action_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.admin_action_log
        ADD CONSTRAINT admin_action_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: bookings bookings_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.bookings
        ADD CONSTRAINT bookings_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: bookings bookings_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.bookings
        ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_applications cleaner_applications_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_applications
        ADD CONSTRAINT cleaner_applications_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_applications cleaner_applications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_applications
        ADD CONSTRAINT cleaner_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_availability cleaner_availability_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_availability
        ADD CONSTRAINT cleaner_availability_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_gallery cleaner_gallery_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_gallery
        ADD CONSTRAINT cleaner_gallery_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_weekly_availability cleaner_weekly_availability_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaner_weekly_availability
        ADD CONSTRAINT cleaner_weekly_availability_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaners cleaners_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.cleaners
        ADD CONSTRAINT cleaners_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: customers customers_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.customers
        ADD CONSTRAINT customers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $$ BEGIN
    ALTER TABLE ONLY public.profiles
        ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;


--
-- Name: cleaner_gallery Cleaners manage own gallery; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Cleaners manage own gallery" ON public.cleaner_gallery;
CREATE POLICY "Cleaners manage own gallery" ON public.cleaner_gallery USING ((cleaner_id = auth.uid())) WITH CHECK ((cleaner_id = auth.uid()));


--
-- Name: cleaner_weekly_availability Cleaners manage own weekly availability; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Cleaners manage own weekly availability" ON public.cleaner_weekly_availability;
CREATE POLICY "Cleaners manage own weekly availability" ON public.cleaner_weekly_availability USING ((cleaner_id = auth.uid())) WITH CHECK ((cleaner_id = auth.uid()));


--
-- Name: cleaner_gallery Public read gallery; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public read gallery" ON public.cleaner_gallery;
CREATE POLICY "Public read gallery" ON public.cleaner_gallery FOR SELECT USING (true);


--
-- Name: admin_action_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaner_applications cleaner manages own application; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "cleaner manages own application" ON public.cleaner_applications;
CREATE POLICY "cleaner manages own application" ON public.cleaner_applications USING ((auth.uid() = cleaner_id));


--
-- Name: cleaner_availability cleaner manages own availability; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "cleaner manages own availability" ON public.cleaner_availability;
CREATE POLICY "cleaner manages own availability" ON public.cleaner_availability USING ((auth.uid() = cleaner_id));


--
-- Name: bookings cleaner reads assigned bookings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "cleaner reads assigned bookings" ON public.bookings;
CREATE POLICY "cleaner reads assigned bookings" ON public.bookings FOR SELECT USING ((auth.uid() = cleaner_id));


--
-- Name: bookings cleaner updates assigned bookings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "cleaner updates assigned bookings" ON public.bookings;
CREATE POLICY "cleaner updates assigned bookings" ON public.bookings FOR UPDATE USING ((auth.uid() = cleaner_id));


--
-- Name: cleaner_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaner_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaner_gallery; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_gallery ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaner_weekly_availability; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_weekly_availability ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaners cleaners manage own row; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "cleaners manage own row" ON public.cleaners;
CREATE POLICY "cleaners manage own row" ON public.cleaners USING ((auth.uid() = id));


--
-- Name: bookings customer manages own bookings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "customer manages own bookings" ON public.bookings;
CREATE POLICY "customer manages own bookings" ON public.bookings USING ((auth.uid() = customer_id));


--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: cleaners public read approved cleaners; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "public read approved cleaners" ON public.cleaners;
CREATE POLICY "public read approved cleaners" ON public.cleaners FOR SELECT USING ((status = 'approved'::public.cleaner_status));


--
-- Name: cleaner_availability public read availability; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "public read availability" ON public.cleaner_availability;
CREATE POLICY "public read availability" ON public.cleaner_availability FOR SELECT USING (true);


--
-- Name: customers users manage own customer; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own customer" ON public.customers;
CREATE POLICY "users manage own customer" ON public.customers USING ((auth.uid() = id));


--
-- Name: profiles users manage own profile; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "users manage own profile" ON public.profiles;
CREATE POLICY "users manage own profile" ON public.profiles USING ((auth.uid() = id));


--
-- PostgreSQL database dump complete
--
