#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <tuple>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace {
struct PhraseStats {
  std::uint64_t count = 0;
  double scoreSum = 0.0;
  std::unordered_map<std::string, std::uint64_t> regionCounts;
  std::unordered_map<std::string, std::uint64_t> tokenCounts;
};

const std::unordered_set<std::string> STOP_WORDS = {
    "a",      "about",  "after",  "again",   "all",    "also",   "am",     "an",     "and",    "any",
    "are",    "around", "as",     "at",      "back",   "be",     "because","been",   "before", "being",
    "but",    "by",     "can",    "come",    "could",  "day",    "did",    "do",     "does",   "done",
    "dont",   "down",   "even",   "every",   "few",    "find",   "first",  "for",    "from",   "get",
    "give",   "go",     "going",  "good",    "got",    "had",    "has",    "have",   "having", "he",
    "her",    "here",   "hers",   "high",    "him",    "his",    "how",    "i",      "if",     "in",
    "into",   "is",     "isnt",   "it",      "its",    "just",   "keep",   "know",   "last",   "like",
    "little", "long",   "look",   "lot",     "made",   "make",   "many",   "may",    "me",     "might",
    "more",   "most",   "much",   "must",    "my",     "need",   "no",     "not",    "now",    "of",
    "off",    "on",     "once",   "one",     "only",   "or",     "other",  "our",    "out",    "over",
    "people", "really", "right",  "same",    "see",    "she",    "should", "since",  "so",     "some",
    "still",  "such",   "take",   "than",    "that",   "the",    "their",  "them",   "then",   "there",
    "these",  "they",   "thing",  "think",   "this",   "those",  "though", "through","time",   "to",
    "too",    "up",     "us",     "very",    "want",   "was",    "way",    "we",     "well",   "were",
    "what",   "when",   "which",  "who",     "why",    "will",   "with",   "without","would",  "year",
    "you",    "your",   "youre"};

struct Options {
  std::string inputPath;
  std::string outputPath = "slang_language_model.json";
  std::uint64_t minCount = 2;
  std::size_t topTokens = 12;
  std::size_t relatedLimit = 5;
};

std::vector<std::string> splitTsv(const std::string &line) {
  std::vector<std::string> columns;
  std::string current;
  for (char ch : line) {
    if (ch == '\t') {
      columns.push_back(std::move(current));
      current.clear();
    } else {
      current.push_back(ch);
    }
  }
  columns.push_back(std::move(current));
  return columns;
}

std::vector<std::string> tokenize(const std::string &text) {
  std::string clean;
  clean.reserve(text.size());
  for (char ch : text) {
    if (std::isalnum(static_cast<unsigned char>(ch))) {
      clean.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));
    } else {
      clean.push_back(' ');
    }
  }
  std::stringstream ss(clean);
  std::vector<std::string> tokens;
  std::string token;
  while (ss >> token) {
    tokens.push_back(token);
  }
  return tokens;
}

std::string jsonEscape(const std::string &input) {
  std::string out;
  out.reserve(input.size() + 4);
  for (char ch : input) {
    switch (ch) {
    case '\"':
      out += "\\\"";
      break;
    case '\\':
      out += "\\\\";
      break;
    case '\n':
      out += "\\n";
      break;
    case '\r':
      out += "\\r";
      break;
    case '\t':
      out += "\\t";
      break;
    default:
      if (static_cast<unsigned char>(ch) < 0x20) {
        std::ostringstream oss;
        oss << "\\u" << std::hex << std::uppercase << std::setw(4) << std::setfill('0')
            << static_cast<int>(static_cast<unsigned char>(ch));
        out += oss.str();
      } else {
        out.push_back(ch);
      }
    }
  }
  return out;
}

Options parseOptions(int argc, char **argv) {
  Options opts;
  for (int i = 1; i < argc; ++i) {
    std::string arg = argv[i];
    if (arg == "--input" && i + 1 < argc) {
      opts.inputPath = argv[++i];
    } else if (arg == "--output" && i + 1 < argc) {
      opts.outputPath = argv[++i];
    } else if (arg == "--min-count" && i + 1 < argc) {
      opts.minCount = static_cast<std::uint64_t>(std::stoull(argv[++i]));
    } else if (arg == "--top-tokens" && i + 1 < argc) {
      opts.topTokens = static_cast<std::size_t>(std::stoull(argv[++i]));
    } else if (arg == "--related-limit" && i + 1 < argc) {
      opts.relatedLimit = static_cast<std::size_t>(std::stoull(argv[++i]));
    } else if (arg == "--help" || arg == "-h") {
      std::cout << "Usage: slang_trainer --input contexts.tsv [--output model.json] [--min-count 2] [--top-tokens 12] "
                   "[--related-limit 5]\n";
      std::exit(0);
    }
  }
  if (opts.inputPath.empty()) {
    throw std::runtime_error("Missing required --input contexts.tsv argument.");
  }
  return opts;
}

double parseScore(const std::string &value) {
  if (value.empty())
    return 0.0;
  try {
    return std::stod(value);
  } catch (...) {
    return 0.0;
  }
}

void updateStats(PhraseStats &stats, const std::string &region, double score,
                 const std::vector<std::string> &tokens, const std::string &phrase) {
  stats.count += 1;
  stats.scoreSum += score;
  if (!region.empty()) {
    stats.regionCounts[region] += 1;
  }
  for (const auto &token : tokens) {
    if (token.size() < 3)
      continue;
    if (token == phrase)
      continue;
    if (STOP_WORDS.find(token) != STOP_WORDS.end())
      continue;
    stats.tokenCounts[token] += 1;
  }
}

std::vector<std::pair<std::string, std::uint64_t>>
topEntries(const std::unordered_map<std::string, std::uint64_t> &counts, std::size_t limit) {
  std::vector<std::pair<std::string, std::uint64_t>> entries(counts.begin(), counts.end());
  std::sort(entries.begin(), entries.end(),
            [](const auto &a, const auto &b) { return a.second != b.second ? a.second > b.second : a.first < b.first; });
  if (entries.size() > limit) {
    entries.resize(limit);
  }
  return entries;
}

using TokenIndex = std::unordered_map<std::string, std::vector<std::pair<std::string, std::uint64_t>>>;

TokenIndex buildTokenIndex(const std::unordered_map<std::string, PhraseStats> &stats) {
  TokenIndex index;
  for (const auto &entry : stats) {
    const auto &phrase = entry.first;
    const auto &stat = entry.second;
    for (const auto &tokenPair : stat.tokenCounts) {
      index[tokenPair.first].push_back({phrase, tokenPair.second});
    }
  }
  return index;
}

std::vector<std::pair<std::string, double>>
relatedPhrases(const std::string &phrase, const PhraseStats &stat, const TokenIndex &index, std::size_t limit) {
  std::unordered_map<std::string, double> scores;
  for (const auto &tokenPair : stat.tokenCounts) {
    auto it = index.find(tokenPair.first);
    if (it == index.end())
      continue;
    for (const auto &other : it->second) {
      if (other.first == phrase)
        continue;
      double weight = static_cast<double>(std::min(tokenPair.second, other.second));
      scores[other.first] += weight;
    }
  }

  std::vector<std::pair<std::string, double>> ranked(scores.begin(), scores.end());
  std::sort(ranked.begin(), ranked.end(), [](const auto &a, const auto &b) {
    if (a.second != b.second)
      return a.second > b.second;
    return a.first < b.first;
  });
  if (ranked.size() > limit) {
    ranked.resize(limit);
  }
  return ranked;
}

} // namespace

int main(int argc, char **argv) {
  try {
    Options options = parseOptions(argc, argv);

    std::ifstream in(options.inputPath);
    if (!in) {
      throw std::runtime_error("Failed to open input TSV: " + options.inputPath);
    }

    std::unordered_map<std::string, PhraseStats> stats;
    std::string line;
    bool headerSkipped = false;
    while (std::getline(in, line)) {
      if (!headerSkipped) {
        headerSkipped = true; // skip header row
        continue;
      }
      auto columns = splitTsv(line);
      if (columns.size() < 5)
        continue;
      const std::string &phrase = columns[0];
      const std::string &region = columns[2];
      const std::string &scoreRaw = columns[3];
      const std::string &context = columns[4];
      auto tokens = tokenize(context);
      double score = parseScore(scoreRaw);
      updateStats(stats[phrase], region, score, tokens, phrase);
    }

    std::ofstream out(options.outputPath);
    if (!out) {
      throw std::runtime_error("Failed to open output file: " + options.outputPath);
    }

    TokenIndex tokenIndex = buildTokenIndex(stats);

    out << "{\n";
    out << "  \"generatedAt\": \"";
    {
      // Basic ISO timestamp (UTC) using system clock
      std::time_t now = std::time(nullptr);
      std::tm *gmt = std::gmtime(&now);
      char buf[32];
      if (std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmt)) {
        out << buf;
      } else {
        out << "1970-01-01T00:00:00Z";
      }
    }
    out << "\",\n";
    out << "  \"phrases\": [\n";

    bool first = true;
    for (const auto &pair : stats) {
      const auto &phrase = pair.first;
      const auto &stat = pair.second;
      if (stat.count < options.minCount)
        continue;
      if (!first) {
        out << ",\n";
      }
      first = false;
      out << "    {\n";
      out << "      \"phrase\": \"" << jsonEscape(phrase) << "\",\n";
      out << "      \"count\": " << stat.count << ",\n";
      double avgScore = stat.count ? stat.scoreSum / static_cast<double>(stat.count) : 0.0;
      out << "      \"avgScore\": " << std::fixed << std::setprecision(4) << avgScore << ",\n";
      out.unsetf(std::ios_base::floatfield);

      auto regions = topEntries(stat.regionCounts, 6);
      out << "      \"regions\": [";
      for (std::size_t i = 0; i < regions.size(); ++i) {
        if (i > 0)
          out << ", ";
        out << "{\"region\": \"" << jsonEscape(regions[i].first) << "\", \"count\": " << regions[i].second << "}";
      }
      out << "],\n";

      auto tokens = topEntries(stat.tokenCounts, options.topTokens);
      out << "      \"topContextTokens\": [";
      for (std::size_t i = 0; i < tokens.size(); ++i) {
        if (i > 0)
          out << ", ";
        out << "{\"token\": \"" << jsonEscape(tokens[i].first) << "\", \"count\": " << tokens[i].second << "}";
      }
      out << "],\n";

      auto related = relatedPhrases(phrase, stat, tokenIndex, options.relatedLimit);
      out << "      \"relatedPhrases\": [";
      for (std::size_t i = 0; i < related.size(); ++i) {
        if (i > 0)
          out << ", ";
        out << "{\"phrase\": \"" << jsonEscape(related[i].first) << "\", \"score\": " << std::fixed << std::setprecision(4)
            << related[i].second << "}";
      }
      out << "]\n";
      out.unsetf(std::ios_base::floatfield);
      out << "    }";
    }

    out << "\n  ]\n";
    out << "}\n";
    std::cout << "Wrote language model summary to " << options.outputPath << "\n";
  } catch (const std::exception &ex) {
    std::cerr << "Error: " << ex.what() << "\n";
    return 1;
  }
  return 0;
}
