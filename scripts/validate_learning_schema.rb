#!/usr/bin/env ruby

require "pathname"
require "set"
require "yaml"
require "date"

ROOT = Pathname.new(__dir__).parent.freeze
PATHWAY_PATTERN = /\Acc\.pathway\.[a-z0-9]+(?:-[a-z0-9]+)*\z/
LESSON_PATTERN = /\Acc\.lesson\.[a-z0-9]+(?:-[a-z0-9]+)*\.week-\d{2}\z/
STAGE_PATTERN = /\Acc\.stage\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*\z/
ACTIVITY_PATTERN = /\Acc\.activity\.[a-z0-9]+(?:-[a-z0-9]+)*\.week-\d{2}\.[a-z0-9]+(?:-[a-z0-9]+)*\z/
ITEM_PATTERN = /\Acc\.item\.[a-z0-9]+(?:-[a-z0-9]+)*\.week-\d{2}\.[a-z0-9]+(?:-[a-z0-9]+)*\z/
CONCEPT_PATTERN = /\Acc\.concept\.[a-z0-9]+(?:-[a-z0-9]+)*\z/
CONFUSION_PATTERN = /\Acc\.confusion\.[a-z0-9]+(?:-[a-z0-9]+)*\z/


def front_matter(path)
  parts = path.read.split(/^---\s*$\n/, 3)
  raise "#{path}: missing YAML front matter" if parts.length < 3

  YAML.safe_load(parts[1], permitted_classes: [Date], aliases: true) || {}
end


errors = []
pathways = {}
pathway_ids = {}

ROOT.glob("_reading_paths/*.md").sort.each do |path|
  data = front_matter(path)
  slug = data["slug"].to_s
  pathway_id = data["pathway_id"].to_s

  errors << "#{path}: missing slug" if slug.empty?
  errors << "#{path}: schema_version must be 1" unless data["schema_version"] == 1
  errors << "#{path}: invalid pathway_id #{pathway_id.inspect}" unless pathway_id.match?(PATHWAY_PATTERN)
  errors << "#{path}: pathway_id must match slug" unless pathway_id == "cc.pathway.#{slug}"
  errors << "#{path}: duplicate slug #{slug.inspect}" if pathways.key?(slug)
  errors << "#{path}: duplicate pathway_id #{pathway_id.inspect}" if pathway_ids.key?(pathway_id)

  readings = Array(data["readings"])
  lectures = Array(data["lectures"])
  reading_ids = readings.map { |item| item["id"].to_s }
  lecture_ids = lectures.map { |item| item["id"].to_s }

  errors << "#{path}: every reading requires an id" if reading_ids.any?(&:empty?)
  errors << "#{path}: reading ids must be unique" unless reading_ids.uniq.length == reading_ids.length
  errors << "#{path}: every lecture requires an id" if lecture_ids.any?(&:empty?)
  errors << "#{path}: lecture ids must be unique" unless lecture_ids.uniq.length == lecture_ids.length

  pathways[slug] = { path: path, data: data, reading_ids: reading_ids }
  pathway_ids[pathway_id] = path
end

lesson_ids = {}
item_ids = {}
lesson_orders = {}
lesson_urls = {}
lesson_navigation = {}
declared_concept_ids = Set.new
review_concept_ids = Set.new

ROOT.glob("_lessons/*.md").sort.each do |path|
  data = front_matter(path)
  pathway = pathways[data["pathway"].to_s]
  lesson_id = data["lesson_id"].to_s
  lesson_url = data["permalink"].to_s

  errors << "#{path}: references unknown pathway #{data['pathway'].inspect}" unless pathway
  errors << "#{path}: schema_version must be 1" unless data["schema_version"] == 1
  errors << "#{path}: invalid lesson_id #{lesson_id.inspect}" unless lesson_id.match?(LESSON_PATTERN)
  errors << "#{path}: invalid stage_id #{data['stage_id'].inspect}" unless data["stage_id"].to_s.match?(STAGE_PATTERN)
  errors << "#{path}: duplicate lesson_id #{lesson_id.inspect}" if lesson_ids.key?(lesson_id)
  errors << "#{path}: missing permalink" if lesson_url.empty?
  errors << "#{path}: duplicate lesson permalink #{lesson_url.inspect}" if lesson_urls.key?(lesson_url)
  errors << "#{path}: pathway_id does not match its pathway" if pathway && data["pathway_id"] != pathway[:data]["pathway_id"]
  errors << "#{path}: concepts_label is required" if data["concepts_label"].to_s.strip.empty?

  order_key = [data["pathway"], data["order"]]
  errors << "#{path}: duplicate lesson order #{data['order'].inspect} for #{data['pathway']}" if lesson_orders.key?(order_key)
  lesson_orders[order_key] = path
  lesson_ids[lesson_id] = path
  lesson_urls[lesson_url] = path
  lesson_navigation[path] = %w[previous_step next_step].to_h do |field|
    step = data[field] || {}
    errors << "#{path}: #{field} requires a label" if step["label"].to_s.strip.empty?
    errors << "#{path}: #{field} requires a URL" if step["url"].to_s.strip.empty?
    [field, step["url"].to_s]
  end

  Array(data["concept_ids"]).each do |concept_id|
    errors << "#{path}: invalid concept_id #{concept_id.inspect}" unless concept_id.to_s.match?(CONCEPT_PATTERN)
    declared_concept_ids << concept_id.to_s
  end

  warmup_item_id = data.dig("warmup", "item_id").to_s
  errors << "#{path}: warmup has invalid item_id #{warmup_item_id.inspect}" unless warmup_item_id.match?(ITEM_PATTERN)
  errors << "#{path}: duplicate item_id #{warmup_item_id.inspect}" if item_ids.key?(warmup_item_id)
  item_ids[warmup_item_id] = path

  %w[checkpoint application].each do |field|
    item = data[field] || {}
    item_id = item["item_id"].to_s
    concept_id = item["concept_id"].to_s

    errors << "#{path}: #{field} has invalid item_id #{item_id.inspect}" unless item_id.match?(ITEM_PATTERN)
    errors << "#{path}: #{field} has invalid concept_id #{concept_id.inspect}" unless concept_id.match?(CONCEPT_PATTERN)
    errors << "#{path}: duplicate item_id #{item_id.inspect}" if item_ids.key?(item_id)
    errors << "#{path}: #{field} requires a prompt" if item["prompt"].to_s.strip.empty?
    errors << "#{path}: #{field} requires a model_answer" if item["model_answer"].to_s.strip.empty?
    errors << "#{path}: #{field} requires feedback_points" if Array(item["feedback_points"]).empty?
    item_ids[item_id] = path
    review_concept_ids << concept_id
  end

  progress_item = data.dig("primary_reading", "progress_item").to_s
  activity_id = data.dig("primary_reading", "activity_id").to_s
  errors << "#{path}: primary_reading has invalid activity_id #{activity_id.inspect}" unless activity_id.match?(ACTIVITY_PATTERN)
  if pathway && !pathway[:reading_ids].include?(progress_item.delete_prefix("reading:"))
    errors << "#{path}: primary_reading progress_item #{progress_item.inspect} does not reference a pathway reading"
  end
end

lesson_orders.keys.group_by(&:first).each do |pathway_slug, keys|
  orders = keys.map(&:last).sort
  expected = (1..orders.length).to_a
  errors << "Lessons for #{pathway_slug} must use contiguous order values: expected #{expected.inspect}, found #{orders.inspect}" unless orders == expected
end

known_navigation_urls = lesson_urls.keys.to_set
known_navigation_urls << "/learn/review/"
pathways.each_value do |pathway|
  known_navigation_urls << pathway[:data]["permalink"].to_s
end

lesson_navigation.each do |path, steps|
  steps.each do |field, url|
    errors << "#{path}: #{field} references unknown learning URL #{url.inspect}" unless known_navigation_urls.include?(url)
  end
end

context_path = ROOT / "_data/learning_contexts.yml"
contexts = YAML.safe_load(context_path.read, aliases: true) || []
chapter_urls = ROOT.glob("_text_chapters/**/*.md").to_h do |path|
  [front_matter(path)["permalink"].to_s, path]
end
seen_context_sources = {}

contexts.each_with_index do |context, index|
  source_url = context["source_url"].to_s
  lesson_url = context["lesson_url"].to_s
  label = "#{context_path}: entry #{index + 1}"

  errors << "#{label} references unknown text chapter #{source_url.inspect}" unless chapter_urls.key?(source_url)
  errors << "#{label} references unknown lesson #{lesson_url.inspect}" unless lesson_urls.key?(lesson_url)
  errors << "#{label} duplicates source_url #{source_url.inspect}" if seen_context_sources.key?(source_url)
  errors << "#{label} requires a position label" if context["position"].to_s.strip.empty?
  seen_context_sources[source_url] = index
end

confusion_path = ROOT / "_data/learning_confusion_sets.yml"
confusion_sets = YAML.safe_load(confusion_path.read, aliases: true) || []
seen_confusion_ids = {}

confusion_sets.each_with_index do |confusion_set, index|
  confusion_id = confusion_set["id"].to_s
  concept_ids = Array(confusion_set["concept_ids"]).map(&:to_s)
  label = "#{confusion_path}: entry #{index + 1}"

  errors << "#{label} has invalid id #{confusion_id.inspect}" unless confusion_id.match?(CONFUSION_PATTERN)
  errors << "#{label} duplicates id #{confusion_id.inspect}" if seen_confusion_ids.key?(confusion_id)
  errors << "#{label} requires a title" if confusion_set["title"].to_s.strip.empty?
  errors << "#{label} requires a contrast cue" if confusion_set["cue"].to_s.strip.empty?
  errors << "#{label} requires at least two concepts" if concept_ids.length < 2
  errors << "#{label} repeats a concept" unless concept_ids.uniq.length == concept_ids.length

  concept_ids.each do |concept_id|
    errors << "#{label} references undeclared concept #{concept_id.inspect}" unless declared_concept_ids.include?(concept_id)
  end

  if (concept_ids & review_concept_ids.to_a).length < 2
    errors << "#{label} must connect at least two concepts used by review items"
  end

  seen_confusion_ids[confusion_id] = index
end

contract_path = ROOT / "_data/learning_schema.yml"
contract = YAML.safe_load(contract_path.read, aliases: true) || {}
telemetry = contract["telemetry"] || {}
required_prohibited_fields = %w[response_text note_body quotation_text full_url dom_path]

errors << "#{contract_path}: schema version must be 1" unless contract["version"] == 1
errors << "#{contract_path}: telemetry must remain disabled until an opt-in event implementation exists" unless telemetry["enabled"] == false
errors << "#{contract_path}: telemetry consent must be explicit_opt_in" unless telemetry["consent"] == "explicit_opt_in"
missing_prohibited = required_prohibited_fields - Array(telemetry["prohibited_fields"])
errors << "#{contract_path}: missing prohibited fields #{missing_prohibited.join(', ')}" unless missing_prohibited.empty?
declared_properties = (telemetry["events"] || {}).values.flatten.map(&:to_s)
prohibited_properties = declared_properties & Array(telemetry["prohibited_fields"])
errors << "#{contract_path}: event schema includes prohibited fields #{prohibited_properties.join(', ')}" unless prohibited_properties.empty?

if errors.any?
  warn "Learning schema validation failed:"
  errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Learning schema valid: #{pathways.length} pathways, #{lesson_ids.length} lessons, and #{item_ids.length} learning items use stable IDs; private-text telemetry remains disabled."
