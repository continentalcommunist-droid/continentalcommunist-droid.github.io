#!/usr/bin/env ruby

require "date"
require "json"
require "pathname"
require "rexml/document"
require "set"
require "time"
require "uri"
require "yaml"

ROOT = Pathname.new(__dir__).parent.freeze
BUILT_SITE = ROOT / "_site"
ARTICLE_TYPES = %w[Article NewsArticle].freeze

def front_matter(path)
  parts = path.read.split(/^---\s*$\n/, 3)
  return {} unless parts.length == 3

  YAML.safe_load(
    parts[1],
    permitted_classes: [Date, Time],
    aliases: true
  ) || {}
end

def present?(value)
  !value.nil? && !value.to_s.strip.empty?
end

def html_metadata(path)
  html = path.read
  links = html.scan(/<link\b[^>]*>/i)
  metas = html.scan(/<meta\b[^>]*>/i)
  canonical = links.filter_map do |tag|
    tag[/\bhref=["']([^"']+)["']/i, 1] if tag.match?(/\brel=["']canonical["']/i)
  end
  robots = metas.filter_map do |tag|
    tag[/\bcontent=["']([^"']+)["']/i] if tag.match?(/\bname=["']robots["']/i)
  end
  schemas = html.scan(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/im
  ).flatten.map { |payload| JSON.parse(payload) }

  { html: html, canonical: canonical, robots: robots, schemas: schemas }
rescue JSON::ParserError => error
  raise JSON::ParserError, "#{path}: #{error.message}"
end

def schema_with_type(schemas, type)
  schemas.find { |schema| Array(schema["@type"]).include?(type) }
end

def built_path_for_url(site_url, url)
  uri = URI.parse(url)
  relative = uri.path.sub(%r{\A/}, "")
  relative = "#{relative}index.html" if uri.path.end_with?("/")
  relative = "index.html" if relative.empty?
  ROOT / "_site" / relative
end

def expected_url_for_path(site_url, path)
  relative = path.relative_path_from(BUILT_SITE).to_s
  if relative == "index.html"
    "#{site_url}/"
  elsif relative.end_with?("/index.html")
    "#{site_url}/#{relative.delete_suffix('index.html')}"
  else
    "#{site_url}/#{relative}"
  end
end

def xml_urls(path)
  document = REXML::Document.new(path.read)
  urls = []
  document.root.each_element do |url_element|
    location = url_element.elements.find { |element| element.name == "loc" }
    urls << [location&.text.to_s.strip, url_element]
  end
  urls
rescue REXML::ParseException => error
  raise REXML::ParseException, "#{path}: #{error.message}"
end

errors = []
config = YAML.safe_load((ROOT / "_config.yml").read, aliases: true)
site_url = config["url"].to_s.delete_suffix("/")

begin
  uri = URI.parse(site_url)
  errors << "_config.yml: url must be an absolute HTTPS origin" unless uri.is_a?(URI::HTTPS) && present?(uri.host)
rescue URI::InvalidURIError
  errors << "_config.yml: url must be an absolute HTTPS origin"
end

errors << "_config.yml: lang is required" unless present?(config["lang"])
publisher = config["publisher"] || {}
%w[name type url logo description alternate_names].each do |field|
  errors << "_config.yml: publisher.#{field} is required" unless present?(publisher[field])
end
canonical_domain = URI.parse(site_url).host.to_s.sub(/\Awww\./, "")
unless Array(publisher["alternate_names"]).include?(canonical_domain)
  errors << "_config.yml: publisher.alternate_names must include #{canonical_domain}"
end
unless config.key?("google_site_verification")
  errors << "_config.yml: google_site_verification hook is missing"
end
verification_file = config["google_site_verification_file"].to_s.strip
expected_verification = "google-site-verification: #{verification_file}"
if verification_file.empty?
  errors << "_config.yml: google_site_verification_file is required"
elsif File.basename(verification_file) != verification_file || !verification_file.match?(/\Agoogle[0-9a-f]+\.html\z/)
  errors << "_config.yml: google_site_verification_file must be a Google HTML verification filename at the site root"
else
  verification_source = ROOT / verification_file
  errors << "#{verification_file}: missing Google Search Console verification file" unless verification_source.file?
  if verification_source.file? && verification_source.read.strip != expected_verification
    errors << "#{verification_file}: verification content does not match its filename"
  end
end

%w[robots.txt sitemap.xml news-sitemap.xml].each do |filename|
  errors << "#{filename}: missing SEO endpoint" unless (ROOT / filename).file?
end

robots_source = (ROOT / "robots.txt").read
%w[sitemap.xml news-sitemap.xml].each do |filename|
  errors << "robots.txt: does not advertise #{filename}" unless robots_source.include?(filename)
end

people = (ROOT / "_people").glob("*.md").to_h do |path|
  data = front_matter(path)
  [data["name"], [path, data]]
end
topics = (ROOT / "_topics").glob("*.md").map { |path| [path, front_matter(path)] }
articles = [(ROOT / "_posts").glob("*.md"), (ROOT / "_briefs").glob("*.md")].flatten.sort

articles.each do |path|
  data = front_matter(path)
  relative = path.relative_path_from(ROOT)
  schema_type = data["schema_type"]
  errors << "#{relative}: schema_type must be Article or NewsArticle" unless ARTICLE_TYPES.include?(schema_type)
  if data["content_type"] == "News" && schema_type != "NewsArticle"
    errors << "#{relative}: News content must use NewsArticle"
  elsif data["content_type"] != "News" && path.to_s.include?("/_posts/") && schema_type == "NewsArticle"
    errors << "#{relative}: NewsArticle is reserved for timely News content"
  end
  errors << "#{relative}: author must resolve to a public People record" unless people.key?(data["author"])
  %w[title description date author].each do |field|
    errors << "#{relative}: missing #{field}" unless present?(data[field])
  end
  if present?(data["image"]) && !present?(data["image_alt"])
    errors << "#{relative}: featured image requires image_alt"
  end
end

people.each_value do |path, data|
  relative = path.relative_path_from(ROOT)
  errors << "#{relative}: layout must be person" unless data["layout"] == "person"
  %w[name description profile_type].each do |field|
    errors << "#{relative}: missing #{field}" unless present?(data[field])
  end
end

topics.each do |path, data|
  relative = path.relative_path_from(ROOT)
  errors << "#{relative}: layout must be topic" unless data["layout"] == "topic"
  %w[name description].each do |field|
    errors << "#{relative}: missing #{field}" unless present?(data[field])
  end
end

cms = YAML.safe_load((ROOT / "admin/config.yml").read, aliases: true)
cms_collections = cms.fetch("collections").select { |item| item.is_a?(Hash) && item["name"] }.to_h do |item|
  [item["name"], item]
end
post_fields = cms_collections.fetch("posts").fetch("fields").to_h { |field| [field["name"], field] }
brief_fields = cms_collections.fetch("briefs").fetch("fields").to_h { |field| [field["name"], field] }
person_fields = cms_collections.fetch("people").fetch("fields").to_h { |field| [field["name"], field] }

%w[schema_type image image_alt].each do |field|
  errors << "CMS posts is missing #{field}" unless post_fields.key?(field)
  errors << "CMS briefs is missing #{field}" unless brief_fields.key?(field)
end
errors << "CMS people must publish through the person layout" unless person_fields.dig("layout", "default") == "person"

unless BUILT_SITE.directory?
  errors << "_site: missing generated site; build before running SEO validation"
end

begin
  sitemap_entries = xml_urls(BUILT_SITE / "sitemap.xml")
  sitemap_urls = sitemap_entries.map(&:first)
  errors << "sitemap.xml: contains duplicate URLs" unless sitemap_urls.uniq.length == sitemap_urls.length
  if present?(verification_file) && sitemap_urls.include?("#{site_url}/#{verification_file}")
    errors << "sitemap.xml: must not list the Search Console verification utility"
  end

  sitemap_urls.each do |url|
    begin
      uri = URI.parse(url)
      unless uri.is_a?(URI::HTTPS) && url.start_with?("#{site_url}/")
        errors << "sitemap.xml: non-canonical URL #{url.inspect}"
        next
      end
    rescue URI::InvalidURIError
      errors << "sitemap.xml: malformed URL #{url.inspect}"
      next
    end

    built_path = built_path_for_url(site_url, url)
    unless built_path.file?
      errors << "sitemap.xml: #{url} has no generated page"
      next
    end

    metadata = html_metadata(built_path)
    errors << "#{built_path.relative_path_from(ROOT)}: expected one canonical" unless metadata[:canonical] == [url]
    if metadata[:robots].length != 1 || metadata[:robots].first.include?("noindex")
      errors << "#{built_path.relative_path_from(ROOT)}: sitemap URL must be indexable"
    end
    errors << "#{built_path.relative_path_from(ROOT)}: missing JSON-LD" if metadata[:schemas].empty?
  end

  BUILT_SITE.glob("**/*.html").sort.each do |path|
    relative = path.relative_path_from(BUILT_SITE).to_s
    next if relative == "admin/index.html" || relative == verification_file

    metadata = html_metadata(path)
    expected_url = expected_url_for_path(site_url, path)
    if metadata[:html].match?(/<meta\b[^>]*http-equiv=["']refresh["']/i)
      errors << "#{path.relative_path_from(ROOT)}: redirect must have one canonical target" unless metadata[:canonical].length == 1
      unless metadata[:robots].length == 1 && metadata[:robots].first.to_s.include?("noindex")
        errors << "#{path.relative_path_from(ROOT)}: redirect must be noindex"
      end
      errors << "#{path.relative_path_from(ROOT)}: redirect appears in sitemap" if sitemap_urls.include?(expected_url)
      next
    end

    errors << "#{path.relative_path_from(ROOT)}: expected one canonical" unless metadata[:canonical].length == 1
    errors << "#{path.relative_path_from(ROOT)}: canonical is not self-referencing" unless metadata[:canonical].first == expected_url
    errors << "#{path.relative_path_from(ROOT)}: expected one robots directive" unless metadata[:robots].length == 1
    errors << "#{path.relative_path_from(ROOT)}: missing JSON-LD" if metadata[:schemas].empty?

    if metadata[:robots].first.to_s.include?("noindex")
      errors << "#{path.relative_path_from(ROOT)}: noindex page appears in sitemap" if sitemap_urls.include?(expected_url)
    elsif !sitemap_urls.include?(expected_url)
      errors << "#{path.relative_path_from(ROOT)}: indexable page is absent from sitemap"
    end
  end

  articles.each do |path|
    data = front_matter(path)
    if path.to_s.include?("/_posts/")
      date = data["date"].respond_to?(:strftime) ? data["date"] : Date.parse(data["date"].to_s)
      slug = path.basename(".md").to_s.sub(/^\d{4}-\d{2}-\d{2}-/, "")
      url = "#{site_url}/#{date.strftime('%Y/%m/%d')}/#{slug}/"
    else
      url = "#{site_url}/briefings/#{path.basename('.md')}/"
    end
    metadata = html_metadata(built_path_for_url(site_url, url))
    article = schema_with_type(metadata[:schemas], data["schema_type"])
    errors << "#{path.relative_path_from(ROOT)}: generated #{data['schema_type']} JSON-LD is missing" unless article
    if article
      author_path, = people[data["author"]]
      expected_author_url = "#{site_url}/people/#{author_path.basename('.md')}/"
      errors << "#{path.relative_path_from(ROOT)}: structured author URL is incorrect" unless article.dig("author", "url") == expected_author_url
    end
  end

  people.each_value do |path, data|
    url = "#{site_url}/people/#{path.basename('.md')}/"
    profile = schema_with_type(html_metadata(built_path_for_url(site_url, url))[:schemas], "ProfilePage")
    expected_type = %w[Organization Editorial\ identity].include?(data["profile_type"]) ? "Organization" : "Person"
    errors << "#{path.relative_path_from(ROOT)}: ProfilePage JSON-LD is missing" unless profile
    if profile && profile.dig("mainEntity", "@type") != expected_type
      errors << "#{path.relative_path_from(ROOT)}: ProfilePage mainEntity must be #{expected_type}"
    end
  end

  topics.each do |path, data|
    url = "#{site_url}/topics/#{path.basename('.md')}/"
    collection = schema_with_type(html_metadata(built_path_for_url(site_url, url))[:schemas], "CollectionPage")
    errors << "#{path.relative_path_from(ROOT)}: CollectionPage JSON-LD is missing" unless collection
    if collection && collection.dig("about", "name") != data["name"]
      errors << "#{path.relative_path_from(ROOT)}: structured topic name does not match"
    end
  end

  news_entries = xml_urls(BUILT_SITE / "news-sitemap.xml")
  news_urls = news_entries.map(&:first)
  errors << "news-sitemap.xml: may contain at most 1,000 URLs" if news_urls.length > 1_000
  errors << "news-sitemap.xml: contains duplicate URLs" unless news_urls.uniq.length == news_urls.length
  news_urls.each do |url|
    errors << "news-sitemap.xml: #{url} is absent from the general sitemap" unless sitemap_urls.include?(url)
    metadata = html_metadata(built_path_for_url(site_url, url))
    errors << "news-sitemap.xml: #{url} does not declare NewsArticle" unless schema_with_type(metadata[:schemas], "NewsArticle")
  end

  verification = config["google_site_verification"].to_s.strip
  homepage = (BUILT_SITE / "index.html").read
  homepage_metadata = html_metadata(BUILT_SITE / "index.html")
  homepage_title = homepage[/<title>(.*?)<\/title>/im, 1].to_s.gsub(/\s+/, " ").strip
  homepage_description = homepage[/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i, 1].to_s.strip
  homepage_headings = homepage.scan(/<h1\b[^>]*>(.*?)<\/h1>/im).flatten.map do |heading|
    text = heading.gsub(/<[^>]+>/, " ").gsub(/\s+/, " ").strip
    image_alts = heading.scan(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/im).flatten
    ([text] + image_alts).reject(&:empty?).join(" ")
  end
  website_schema = schema_with_type(homepage_metadata[:schemas], "WebSite")
  organization_schema = schema_with_type(homepage_metadata[:schemas], publisher["type"])

  errors << "homepage: title must start with the publication name" unless homepage_title.start_with?(config["title"].to_s)
  errors << "homepage: description must name the publication" unless homepage_description.include?(config["title"].to_s)
  unless homepage_description.length.between?(80, 180)
    errors << "homepage: description must be between 80 and 180 characters"
  end
  errors << "homepage: h1 must expose the publication name as text or image alt text" unless homepage_headings == [config["title"]]
  if homepage.match?(/<h1\b[^>]*class=["'][^"']*cc-visually-hidden/i)
    errors << "homepage: publication h1 must not be visually hidden"
  end
  errors << "homepage: WebSite JSON-LD is missing" unless website_schema
  if website_schema
    errors << "homepage: WebSite name must match site.title" unless website_schema["name"] == config["title"]
    unless Array(website_schema["alternateName"]).include?(canonical_domain)
      errors << "homepage: WebSite alternateName must include #{canonical_domain}"
    end
  end
  errors << "homepage: Organization JSON-LD is missing" unless organization_schema
  if organization_schema && organization_schema["name"] != publisher["name"]
    errors << "homepage: Organization name must match publisher.name"
  end

  homepage_sitemap_entry = sitemap_entries.find { |url, _element| url == "#{site_url}/" }
  homepage_lastmod = homepage_sitemap_entry&.last&.elements&.find { |element| element.name == "lastmod" }
  errors << "sitemap.xml: homepage must carry an accurate lastmod" unless present?(homepage_lastmod&.text)

  about_metadata = html_metadata(BUILT_SITE / "about/index.html")
  errors << "about: AboutPage JSON-LD is missing" unless schema_with_type(about_metadata[:schemas], "AboutPage")

  verification_tags = homepage.scan(/<meta\b[^>]*name=["']google-site-verification["'][^>]*>/i)
  if verification.empty?
    errors << "Search Console: blank verification value must not emit a tag" unless verification_tags.empty?
  elsif verification_tags.none? { |tag| tag.include?(verification) }
    errors << "Search Console: configured verification token is absent from the homepage"
  end

  verification_output = BUILT_SITE / verification_file
  errors << "#{verification_file}: missing from generated site root" unless verification_output.file?
  if verification_output.file? && verification_output.read.strip != expected_verification
    errors << "#{verification_file}: generated verification content does not match Google's token"
  end
rescue Errno::ENOENT, JSON::ParserError, REXML::ParseException => error
  errors << error.message
end

if errors.any?
  warn "SEO validation failed:"
  errors.uniq.each { |error| warn "- #{error}" }
  exit 1
end

verification_status = present?(config["google_site_verification"]) ? "configured" : "unused"
puts "SEO valid: #{sitemap_urls.length} canonical URLs, #{articles.length} articles, #{people.length} author profiles, #{topics.length} topic hubs, #{news_urls.length} recent news URLs."
puts "Search Console verification: HTML file #{verification_file} is ready; meta-tag fallback #{verification_status}."
