#!/usr/bin/env ruby

require "pathname"
require "yaml"

ROOT = Pathname.new(__dir__).parent.freeze
SITE = ROOT / "_site"

abort "Build the site before validating formatting." unless SITE.directory?

errors = []
files = SITE.glob("**/*.html").sort
config = YAML.safe_load((ROOT / "_config.yml").read, aliases: true)
verification_file = config["google_site_verification_file"].to_s.strip
non_page_files = ["admin/index.html", verification_file]
public_files = files.reject { |file| non_page_files.include?(file.relative_path_from(SITE).to_s) }

public_files.each do |file|
  relative = file.relative_path_from(SITE).to_s
  html = file.read

  h1_count = html.scan(/<h1\b/i).length
  errors << "#{relative}: expected exactly one h1, found #{h1_count}" unless h1_count == 1

  heading_levels = html.scan(/<h([1-6])\b/i).flatten.map(&:to_i)
  heading_levels.each_cons(2) do |previous, current|
    if current > previous + 1
      errors << "#{relative}: heading level jumps from h#{previous} to h#{current}"
    end
  end

  ids = html.scan(/\bid=(['"])(.*?)\1/i).map { |match| match.last }
  ids.tally.each do |id, count|
    errors << "#{relative}: duplicate id #{id.inspect}" if count > 1
  end

  html.scan(/<img\b[^>]*>/im).each do |image|
    errors << "#{relative}: image is missing alt text" unless image.match?(/\balt\s*=/i)
    errors << "#{relative}: image is missing width" unless image.match?(/\bwidth\s*=/i)
    errors << "#{relative}: image is missing height" unless image.match?(/\bheight\s*=/i)
  end

  ["{{", "{%", "&lt;img", "frameborder=", "scrolling="].each do |artifact|
    errors << "#{relative}: rendered formatting artifact #{artifact.inspect}" if html.include?(artifact)
  end

  if html.match?(/<(?:svg|img)\b[^>]*(?:width|height)=["'][0-9]+px["']/i)
    errors << "#{relative}: intrinsic media dimensions must be unitless"
  end
end

if errors.any?
  warn "Formatting validation failed:"
  errors.each { |error| warn "- #{error}" }
  exit 1
end

puts "Formatting valid: #{public_files.length} public HTML pages, one h1 per page, ordered headings, unique IDs, and dimensioned images."
