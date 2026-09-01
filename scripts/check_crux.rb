#!/usr/bin/env ruby

require "json"
require "net/http"
require "pathname"
require "time"
require "uri"

ROOT = Pathname.new(__dir__).parent.freeze
BASELINE_PATH = ROOT / "performance/baseline.json"
TARGETS_PATH = ROOT / "performance/targets.json"
OUTPUT_PATH = ROOT / "performance-results/crux.json"
ORIGIN = "https://www.continentalcommunist.com"
FORM_FACTORS = %w[PHONE DESKTOP].freeze
METRICS = {
  "largest_contentful_paint" => {
    label: "LCP",
    maximum: 2_500.0,
    unit: "ms"
  },
  "interaction_to_next_paint" => {
    label: "INP",
    maximum: 200.0,
    unit: "ms"
  },
  "cumulative_layout_shift" => {
    label: "CLS",
    maximum: 0.1,
    unit: ""
  }
}.freeze

class CruxError < StandardError; end

def query_crux(api_key, payload)
  endpoint = URI("https://chromeuxreport.googleapis.com/v1/records:queryRecord")
  endpoint.query = URI.encode_www_form(key: api_key)
  request = Net::HTTP::Post.new(endpoint)
  request["Content-Type"] = "application/json"
  request.body = JSON.generate(payload)

  response = Net::HTTP.start(
    endpoint.host,
    endpoint.port,
    use_ssl: true,
    open_timeout: 15,
    read_timeout: 45
  ) { |http| http.request(request) }

  return JSON.parse(response.body) if response.is_a?(Net::HTTPSuccess)

  error_body = JSON.parse(response.body) rescue {}
  status = error_body.dig("error", "status")
  return nil if response.code == "404" || status == "NOT_FOUND"

  message = error_body.dig("error", "message") || "HTTP #{response.code}"
  raise CruxError, "CrUX API request failed: #{message}"
end

def summarize_record(response, label, form_factor)
  metrics = response.fetch("record").fetch("metrics")
  values = METRICS.to_h do |metric, policy|
    raw_value = metrics.dig(metric, "percentiles", "p75")
    raise CruxError, "#{label} #{form_factor}: missing #{policy[:label]} p75" if raw_value.nil?

    value = raw_value.to_f
    [metric, {
      "label" => policy[:label],
      "p75" => value,
      "maximum" => policy[:maximum],
      "unit" => policy[:unit],
      "passes" => value <= policy[:maximum]
    }]
  end

  {
    "label" => label,
    "formFactor" => form_factor,
    "key" => response.dig("record", "key"),
    "collectionPeriod" => response.dig("record", "collectionPeriod"),
    "metrics" => values,
    "passes" => values.values.all? { |metric| metric["passes"] }
  }
end

def print_record(record)
  details = record.fetch("metrics").values.map do |metric|
    value = metric.fetch("p75")
    formatted = metric["unit"] == "ms" ? "#{value.round}ms" : value.round(3).to_s
    "#{metric['label']} #{formatted}"
  end
  marker = record["passes"] ? "PASS" : "FAIL"
  puts "#{marker} #{record['label']} #{record['formFactor']}: #{details.join(', ')}"
end

def evaluate_records(records, minimum_pass_rate)
  origin_records = records.select { |record| record["scope"] == "origin" }
  page_records = records.select { |record| record["scope"] == "url" }
  failures = []

  origin_records.each do |record|
    print_record(record)
    failures << "#{record['label']} #{record['formFactor']} does not pass all Core Web Vitals" unless record["passes"]
  end

  page_records.each { |record| print_record(record) }
  if page_records.any?
    passing = page_records.count { |record| record["passes"] }
    pass_rate = passing.fdiv(page_records.length)
    puts "Measured URL pass rate: #{(pass_rate * 100).round(1)}% (#{passing}/#{page_records.length})"
    if pass_rate < minimum_pass_rate
      failures << "measured URL pass rate is below #{(minimum_pass_rate * 100).round}%"
    end
  else
    puts "No individual target URL has sufficient CrUX data; origin data is the field criterion."
  end

  failures
end

targets = JSON.parse(TARGETS_PATH.read)
minimum_pass_rate = targets.fetch("minimumFieldPassRate").to_f
api_key = ENV["CRUX_API_KEY"].to_s.strip
require_data = ENV["PERFORMANCE_REQUIRE_CRUX_DATA"] == "1"

if api_key.empty?
  baseline = JSON.parse(BASELINE_PATH.read)
  crux = baseline.fetch("crux")

  if crux["status"] == "no-data"
    puts "CrUX baseline: no eligible field data as of #{baseline.fetch('capturedAt')}."
    puts "Lighthouse CI remains the enforceable release gate until CrUX has sufficient traffic."
    if require_data
      warn "CrUX validation failed: live data is required but CRUX_API_KEY is not configured."
      exit 1
    end
    exit 0
  end

  records = crux.fetch("records")
  failures = evaluate_records(records, minimum_pass_rate)
  if failures.any?
    warn "CrUX validation failed:"
    failures.each { |failure| warn "- #{failure}" }
    exit 1
  end
  exit 0
end

records = []
unavailable = []

FORM_FACTORS.each do |form_factor|
  response = query_crux(
    api_key,
    {
      origin: ORIGIN,
      formFactor: form_factor,
      metrics: METRICS.keys
    }
  )

  if response
    record = summarize_record(response, "Origin", form_factor)
    record["scope"] = "origin"
    records << record
  else
    unavailable << { "scope" => "origin", "value" => ORIGIN, "formFactor" => form_factor }
  end
end

targets.fetch("urls").each do |target|
  url = "#{ORIGIN}#{target.fetch('path')}"
  FORM_FACTORS.each do |form_factor|
    response = query_crux(
      api_key,
      {
        url: url,
        formFactor: form_factor,
        metrics: METRICS.keys
      }
    )

    if response
      record = summarize_record(response, target.fetch("name"), form_factor)
      record["scope"] = "url"
      records << record
    else
      unavailable << { "scope" => "url", "value" => url, "formFactor" => form_factor }
    end
  end
end

result = {
  "capturedAt" => Time.now.iso8601,
  "origin" => ORIGIN,
  "minimumFieldPassRate" => minimum_pass_rate,
  "records" => records,
  "unavailable" => unavailable
}
OUTPUT_PATH.dirname.mkpath
OUTPUT_PATH.write(JSON.pretty_generate(result) + "\n")

if records.none? { |record| record["scope"] == "origin" }
  puts "CrUX field gate: no eligible origin data yet."
  puts "Lighthouse CI remains the enforceable release gate until CrUX has sufficient traffic."
  exit(require_data ? 1 : 0)
end

failures = evaluate_records(records, minimum_pass_rate)
if failures.any?
  warn "CrUX validation failed:"
  failures.each { |failure| warn "- #{failure}" }
  exit 1
end

puts "CrUX field gate passed."
