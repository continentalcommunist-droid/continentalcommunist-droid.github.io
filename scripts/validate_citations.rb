#!/usr/bin/env ruby

require "date"
require "pathname"
require "set"
require "uri"
require "yaml"

ROOT = Pathname.new(__dir__).parent.freeze
EVIDENCE_ROLES = [
  "Direct evidence",
  "Primary context",
  "Background / context",
  "Counterevidence",
  "Method / data",
  "Further reading"
].freeze
SOURCE_TYPES = [
  "Primary document",
  "Book",
  "Journal article",
  "Government report",
  "Research report",
  "Dataset",
  "News report",
  "Website",
  "Archive",
  "Audio / Video",
  "Other"
].freeze

def front_matter(path)
  parts = path.read.split(/^---\s*$\n/, 3)
  return [{}, ""] unless parts.length == 3

  data = YAML.safe_load(
    parts[1],
    permitted_classes: [Date, Time],
    aliases: true
  ) || {}

  [data, parts[2]]
end

def values(value)
  Array(value).compact.map { |item| item.to_s.strip }.reject(&:empty?)
end

def valid_https_url?(value)
  uri = URI.parse(value)
  uri.is_a?(URI::HTTPS) && uri.host && !uri.host.empty?
rescue URI::InvalidURIError
  false
end

errors = []
source_files = (ROOT / "_sources").glob("*.md").sort
person_names = (ROOT / "_people").glob("*.md").map do |path|
  front_matter(path).first.fetch("name")
end.to_set
topic_names = (ROOT / "_topics").glob("*.md").map do |path|
  front_matter(path).first.fetch("name")
end.to_set

sources = {}
keys = {}

source_files.each do |path|
  data, = front_matter(path)
  relative = path.relative_path_from(ROOT)
  slug = path.basename(".md").to_s
  key = data["cite_key"].to_s.strip

  %w[title cite_key description date source_type language].each do |field|
    errors << "#{relative}: missing #{field}" if data[field].to_s.strip.empty?
  end

  errors << "#{relative}: layout must be source" unless data["layout"] == "source"
  errors << "#{relative}: content_type must be Source / Reference" unless data["content_type"] == "Source / Reference"
  errors << "#{relative}: invalid citation key #{key.inspect}" unless key.match?(/\A[a-z][a-z0-9]+\z/)
  errors << "#{relative}: duplicate citation key #{key.inspect}" if keys.key?(key)
  keys[key] = relative

  authors = values(data["authors"])
  organization = data["organizational_author"].to_s.strip
  if authors.empty? && organization.empty?
    errors << "#{relative}: provide named authors or an organizational author"
  end

  authors.each do |author|
    errors << "#{relative}: unknown canonical author #{author.inspect}" unless person_names.include?(author)
  end

  values(data["topics"]).each do |topic|
    errors << "#{relative}: unknown controlled topic #{topic.inspect}" unless topic_names.include?(topic)
  end

  unless SOURCE_TYPES.include?(data["source_type"])
    errors << "#{relative}: invalid source type #{data['source_type'].inspect}"
  end

  source_url = data["source_url"].to_s.strip
  unless source_url.empty?
    errors << "#{relative}: canonical URL must be an absolute HTTPS URL" unless valid_https_url?(source_url)
    errors << "#{relative}: URL records require an access date" if data["access_date"].to_s.strip.empty?
  end

  doi = data["doi"].to_s.strip
  unless doi.empty?
    errors << "#{relative}: store a bare DOI, not a doi.org URL" if doi.match?(%r{\Ahttps?://}i)
    errors << "#{relative}: malformed DOI #{doi.inspect}" unless doi.match?(%r{\A10\.\d{4,9}/\S+\z})
  end

  isbn = data["isbn"].to_s.strip
  unless isbn.empty?
    normalized_isbn = isbn.gsub(/[^0-9Xx]/, "")
    unless [10, 13].include?(normalized_isbn.length)
      errors << "#{relative}: ISBN must contain 10 or 13 digits"
    end
  end

  sources[slug] = data
end

book_files = (ROOT / "_books").glob("*.md").sort
books = {}
book_files.each do |path|
  data, = front_matter(path)
  slug = path.basename(".md").to_s
  books[slug] = data
end

article_files = ((ROOT / "_posts").glob("*.md") + (ROOT / "_briefs").glob("*.md")).sort
reference_count = 0
inline_count = 0

article_files.each do |path|
  data, body = front_matter(path)
  relative = path.relative_path_from(ROOT)
  references = data["references"]

  errors << "#{relative}: legacy sources field is prohibited; use structured references" if data.key?("sources")
  unless references.nil? || references.is_a?(Array)
    errors << "#{relative}: references must be a list"
    next
  end

  referenced_slugs = Set.new
  Array(references).each_with_index do |reference, index|
    position = index + 1
    unless reference.is_a?(Hash)
      errors << "#{relative}: reference #{position} must be a structured object"
      next
    end

    slug = (reference["source"] || reference["book_source"] || reference["custom_source"]).to_s.strip
    reference_count += 1
    if slug.empty?
      errors << "#{relative}: reference #{position} has no source or text identifier"
      next
    end

    has_known_record = sources.key?(slug) || books.key?(slug)
    has_custom_definition = !reference["custom_title"].to_s.strip.empty? || !reference["title"].to_s.strip.empty? || !reference["custom_source"].to_s.strip.empty?

    unless has_known_record || has_custom_definition
      errors << "#{relative}: reference #{position} points to unknown source #{slug.inspect}"
    end

    errors << "#{relative}: source #{slug.inspect} is listed more than once" if referenced_slugs.include?(slug)
    referenced_slugs << slug

    role = reference["evidence_role"]
    errors << "#{relative}: reference #{position} has invalid evidence role #{role.inspect}" unless EVIDENCE_ROLES.include?(role)
    errors << "#{relative}: reference #{position} requires an evidence note" if reference["note"].to_s.strip.empty?
  end

  inline_slugs = body.scan(/{%\s*include\s+cite\.html\b[^%]*\bsource=["']([^"']+)["'][^%]*%}/).flatten
  inline_count += inline_slugs.length
  inline_slugs.each do |slug|
    unless referenced_slugs.include?(slug)
      errors << "#{relative}: inline citation #{slug.inspect} is absent from structured references"
    end
  end
end

config = YAML.safe_load((ROOT / "_config.yml").read, aliases: true)
source_config = config.fetch("collections").fetch("sources")
unless source_config["output"] == true && source_config["permalink"] == "/library/sources/:name/"
  errors << "_config.yml: sources must publish at /library/sources/:name/"
end

cms = YAML.safe_load((ROOT / "admin/config.yml").read, aliases: true)
cms_collections = cms.fetch("collections").select { |item| item.is_a?(Hash) }.to_h do |item|
  [item["name"], item]
end
post_fields = cms_collections.fetch("posts").fetch("fields").to_h { |field| [field["name"], field] }
source_fields = cms_collections.fetch("sources").fetch("fields").to_h { |field| [field["name"], field] }

unless post_fields.dig("references", "widget") == "list"
  errors << "CMS posts.references must be a structured list"
end

%w[cite_key source_url source_type access_date primary_source rights excerpt].each do |field|
  errors << "CMS sources is missing #{field}" unless source_fields.key?(field)
end

if errors.any?
  warn "Citation validation failed:"
  errors.uniq.each { |error| warn "- #{error}" }
  exit 1
end

puts "Citations valid: #{sources.length} source records, #{reference_count} article references, #{inline_count} inline citations."
