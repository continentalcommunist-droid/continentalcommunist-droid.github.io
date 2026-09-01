#!/usr/bin/env ruby

require "json"
require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).parent
CONFIG_PATH = ROOT.join("_config.yml")
MIGRATION_PATH = ROOT.join(
  "supabase/migrations/20260901090000_create_learner_platform.sql"
)
ACCOUNT_PATH = ROOT.join("account.md")
CLIENT_PATH = ROOT.join("assets/supabase-client.js")
PROGRESS_PATH = ROOT.join("assets/learning-progress.js")

errors = []

[CONFIG_PATH, MIGRATION_PATH, ACCOUNT_PATH, CLIENT_PATH, PROGRESS_PATH].each do |path|
  errors << "missing required file: #{path.relative_path_from(ROOT)}" unless path.file?
end

if errors.empty?
  config = YAML.safe_load_file(CONFIG_PATH, aliases: true) || {}
  supabase = config.fetch("supabase", {})
  url = supabase.fetch("url", "").to_s.strip
  key = supabase.fetch("publishable_key", "").to_s.strip
  version = supabase.fetch("javascript_version", "").to_s.strip
  migration = MIGRATION_PATH.read
  account = ACCOUNT_PATH.read
  client = CLIENT_PATH.read
  progress = PROGRESS_PATH.read

  if url.empty? ^ key.empty?
    errors << "configure both supabase.url and supabase.publishable_key, or leave both blank"
  end

  if !url.empty? && !url.match?(%r{\Ahttps://[^\s]+\z})
    errors << "supabase.url must be an HTTPS URL"
  end

  if key.include?("service_role") || key.start_with?("sb_secret_")
    errors << "supabase.publishable_key must never contain a server-only key"
  end

  unless version.match?(/\A\d+\.\d+\.\d+\z/)
    errors << "supabase.javascript_version must be an exact semantic version"
  end

  %w[learner_profiles learner_pathways learner_progress].each do |table|
    errors << "migration does not create #{table}" unless migration.include?("create table public.#{table}")
    errors << "migration does not enable RLS for #{table}" unless migration.include?("alter table public.#{table} enable row level security")
    errors << "migration does not revoke anonymous access to #{table}" unless migration.include?("revoke all on table public.#{table} from anon, authenticated")
  end

  policy_count = migration.scan(/^create policy /).length
  errors << "expected 11 explicit learner RLS policies, found #{policy_count}" unless policy_count == 11

  errors << "account page must remain out of search indexes" unless account.include?("robots: noindex,follow")
  errors << "client must reject service-role keys" unless client.include?(%q{=== "service_role"})
  errors << "progress sync must preserve anonymous storage" unless progress.include?("ANONYMOUS_STATE_KEY")
  errors << "progress sync must use per-user cache keys" unless progress.include?("USER_STATE_PREFIX")
end

if errors.any?
  warn "Learner platform validation failed:"
  errors.each { |error| warn "- #{error}" }
  exit 1
end

config = YAML.safe_load_file(CONFIG_PATH, aliases: true) || {}
connected = !config.dig("supabase", "url").to_s.strip.empty?
puts "Learner platform valid: 3 private tables, 11 owner-only RLS policies, Supabase #{connected ? 'configured' : 'awaiting public project values'}."
