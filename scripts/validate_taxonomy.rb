#!/usr/bin/env ruby

require "date"
require "pathname"
require "set"
require "yaml"

ROOT = Pathname.new(__dir__).parent.freeze
TAXONOMY = YAML.safe_load(
  (ROOT / "_data/taxonomy.yml").read,
  permitted_classes: [Date, Time],
  aliases: true
).freeze

def front_matter(path)
  parts = path.read.split(/^---\s*$\n/, 3)
  return {} unless parts.length == 3

  YAML.safe_load(
    parts[1],
    permitted_classes: [Date, Time],
    aliases: true
  ) || {}
end

def values(value)
  Array(value).compact.map { |item| item.to_s.strip }.reject(&:empty?)
end

def normalized(value)
  value.to_s.downcase.gsub(/[^a-z0-9]+/, " ").strip
end

errors = []
topic_files = (ROOT / "_topics").glob("*.md").sort
person_files = (ROOT / "_people").glob("*.md").sort
topic_records = topic_files.map { |path| [path, front_matter(path)] }
person_records = person_files.map { |path| [path, front_matter(path)] }
topics = topic_records.to_h { |path, data| [data.fetch("name"), path] }
people = person_records.to_h { |path, data| [data.fetch("name"), path] }

if topics.length != topic_files.length
  errors << "Topic names must be unique."
end

if people.length != person_files.length
  errors << "Person names must be unique."
end

topic_names_by_normalized = topics.keys.group_by { |name| normalized(name) }
topic_names_by_normalized.each_value do |names|
  errors << "Near-duplicate topic names: #{names.join(', ')}" if names.length > 1
end

term_owner = {}
topic_records.each do |path, data|
  name = data.fetch("name")

  ([name] + values(data["synonyms"])).each do |term|
    key = normalized(term)
    owner = term_owner[key]
    if owner && owner != name
      errors << "#{path}: term #{term.inspect} conflicts with canonical topic #{owner.inspect}"
    else
      term_owner[key] = name
    end
  end
end

person_term_owner = {}
person_records.each do |path, data|
  name = data.fetch("name")

  ([name] + values(data["aliases"])).each do |term|
    key = normalized(term)
    owner = person_term_owner[key]
    if owner && owner != name
      errors << "#{path}: identity #{term.inspect} conflicts with canonical person #{owner.inspect}"
    else
      person_term_owner[key] = name
    end
  end
end

family_names = TAXONOMY.fetch("topic_families").map { |family| family.fetch("name") }.sort
root_names = topic_records.filter_map do |_path, data|
  data.fetch("name") if data["parent"].to_s.strip.empty?
end.sort

if root_names != family_names
  errors << "Root topics must exactly match the governed topic families: #{family_names.join(', ')}"
end

parent_by_topic = {}
topic_records.each do |path, data|
  name = data["name"]
  parent = data["parent"]
  related = values(data["related_topics"])

  errors << "#{path}: missing description" if data["description"].to_s.strip.empty?
  unless %w[Core Active Proposed Retired].include?(data["taxonomy_status"])
    errors << "#{path}: invalid taxonomy status #{data['taxonomy_status'].inspect}"
  end
  errors << "#{path}: parent #{parent.inspect} is not canonical" if parent && !topics.key?(parent)
  errors << "#{path}: cannot be its own parent" if parent == name
  parent_by_topic[name] = parent if parent

  related.each do |related_name|
    errors << "#{path}: related topic #{related_name.inspect} is not canonical" unless topics.key?(related_name)
    errors << "#{path}: cannot relate a topic to itself" if related_name == name
  end
end

parent_by_topic.each_key do |topic|
  visited = Set.new
  current = topic

  while (current = parent_by_topic[current])
    if visited.include?(current)
      errors << "Topic hierarchy contains a cycle involving #{topic}."
      break
    end

    visited << current
  end
end

managed_patterns = %w[
  _posts/*.md
  _briefs/*.md
  _courses/*.md
  _lessons/*.md
  _reading_paths/*.md
  _books/*.md
  _sources/*.md
  _concepts/*.md
  _events/*.md
  _podcasts/*.md
]
managed_files = managed_patterns.flat_map { |pattern| ROOT.glob(pattern) }.sort
vocabularies = TAXONOMY.fetch("vocabularies")
max_topics = TAXONOMY.fetch("governance").fetch("max_topics_per_item")

managed_files.each do |path|
  data = front_matter(path)
  relative_path = path.relative_path_from(ROOT)
  assigned_topics = values(data["topics"])

  errors << "#{relative_path}: tags are prohibited; use controlled topics" if data.key?("tags")
  if values(data["categories"]).any?
    errors << "#{relative_path}: categories are prohibited; use controlled topics"
  end

  if assigned_topics.length > max_topics
    errors << "#{relative_path}: has #{assigned_topics.length} topics; maximum is #{max_topics}"
  end

  assigned_topics.each do |topic|
    errors << "#{relative_path}: unknown topic #{topic.inspect}" unless topics.key?(topic)
  end

  %w[author editor].each do |field|
    values(data[field]).each do |person|
      errors << "#{relative_path}: unknown #{field} #{person.inspect}" unless people.key?(person)
    end
  end

  %w[authors instructors people thinkers].each do |field|
    values(data[field]).each do |person|
      errors << "#{relative_path}: unknown person in #{field}: #{person.inspect}" unless people.key?(person)
    end
  end

  {
    "region" => "regions",
    "historical_period" => "historical_periods",
    "languages" => "languages"
  }.each do |field, vocabulary|
    values(data[field]).each do |value|
      unless vocabularies.fetch(vocabulary).include?(value)
        errors << "#{relative_path}: unknown #{field} #{value.inspect}"
      end
    end
  end

  %w[level reading_level].each do |field|
    values(data[field]).each do |value|
      unless vocabularies.fetch("difficulties").include?(value)
        errors << "#{relative_path}: unknown difficulty #{value.inspect}"
      end
    end
  end
end

cms = YAML.safe_load(
  (ROOT / "admin/config.yml").read,
  permitted_classes: [Date, Time],
  aliases: true
)

walk_fields = lambda do |fields, collection_name|
  Array(fields).each do |field|
    next unless field.is_a?(Hash)

    name = field["name"]
    widget = field["widget"]

    if %w[thinkers authors].include?(name) && widget == "list"
      errors << "CMS #{collection_name}.#{name} is free-form; use a controlled relation"
    end

    if name == "topics"
      unless widget == "relation" && field["collection"] == "topics" && field["multiple"] == true
        errors << "CMS #{collection_name}.topics must use the canonical Topics relation"
      end

      if field["max"] != max_topics
        errors << "CMS #{collection_name}.topics must enforce the #{max_topics}-topic limit"
      end
    end

    walk_fields.call(field["fields"], collection_name) if field["fields"]
  end
end

cms.fetch("collections").each do |collection|
  next unless collection.is_a?(Hash) && collection["name"]

  walk_fields.call(collection["fields"], collection["name"])
end

if errors.any?
  warn "Taxonomy validation failed:"
  errors.uniq.each { |error| warn "- #{error}" }
  exit 1
end

puts "Taxonomy valid: #{topics.length} topics, #{people.length} people, #{managed_files.length} managed content records."
