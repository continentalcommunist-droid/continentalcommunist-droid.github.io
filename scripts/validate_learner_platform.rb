#!/usr/bin/env ruby

require "json"
require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).parent
CONFIG_PATH = ROOT.join("_config.yml")
MIGRATION_PATHS = ROOT.glob("supabase/migrations/*.sql").sort
ACCOUNT_PATH = ROOT.join("account.md")
CLIENT_PATH = ROOT.join("assets/supabase-client.js")
PROGRESS_PATH = ROOT.join("assets/learning-progress.js")
TOOLS_PATH = ROOT.join("assets/learner-tools.js")
TOOLS_INCLUDE_PATH = ROOT.join("_includes/learner-tools.html")

errors = []

[CONFIG_PATH, ACCOUNT_PATH, CLIENT_PATH, PROGRESS_PATH, TOOLS_PATH, TOOLS_INCLUDE_PATH].each do |path|
  errors << "missing required file: #{path.relative_path_from(ROOT)}" unless path.file?
end

errors << "missing learner database migrations" if MIGRATION_PATHS.empty?

if errors.empty?
  config = YAML.safe_load_file(CONFIG_PATH, aliases: true) || {}
  supabase = config.fetch("supabase", {})
  url = supabase.fetch("url", "").to_s.strip
  key = supabase.fetch("publishable_key", "").to_s.strip
  version = supabase.fetch("javascript_version", "").to_s.strip
  migrations = MIGRATION_PATHS.map(&:read).join("\n")
  account = ACCOUNT_PATH.read
  client = CLIENT_PATH.read
  progress = PROGRESS_PATH.read
  tools = TOOLS_PATH.read
  tools_include = TOOLS_INCLUDE_PATH.read

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

  %w[learner_profiles learner_pathways learner_progress learner_bookmarks learner_notes].each do |table|
    errors << "migration does not create #{table}" unless migrations.include?("create table public.#{table}")
    errors << "migration does not enable RLS for #{table}" unless migrations.include?("alter table public.#{table} enable row level security")
    errors << "migration does not revoke anonymous access to #{table}" unless migrations.include?("revoke all on table public.#{table} from anon, authenticated")
  end

  policy_count = migrations.scan(/^create policy /).length
  errors << "expected 19 explicit learner RLS policies, found #{policy_count}" unless policy_count == 19

  errors << "account page must remain out of search indexes" unless account.include?("robots: noindex,follow")
  errors << "client must reject service-role keys" unless client.include?(%q{=== "service_role"})
  errors << "progress sync must preserve anonymous storage" unless progress.include?("ANONYMOUS_STATE_KEY")
  errors << "progress sync must use per-user cache keys" unless progress.include?("USER_STATE_PREFIX")
  errors << "learner tools must use the private bookmarks table" unless tools.include?(%q{from("learner_bookmarks")})
  errors << "learner tools must use the private notes table" unless tools.include?(%q{from("learner_notes")})
  errors << "learner tools must offer a dashboard link" unless tools_include.include?("data-learner-tools-dashboard")
end

if errors.any?
  warn "Learner platform validation failed:"
  errors.each { |error| warn "- #{error}" }
  exit 1
end

config = YAML.safe_load_file(CONFIG_PATH, aliases: true) || {}
connected = !config.dig("supabase", "url").to_s.strip.empty?
puts "Learner platform valid: 5 private tables, 19 owner-only RLS policies, Supabase #{connected ? 'configured' : 'awaiting public project values'}."
