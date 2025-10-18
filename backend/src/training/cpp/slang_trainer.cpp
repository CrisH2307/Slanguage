#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <cmath>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <limits>
#include <random>

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
  std::string graphOutputPath;
  std::string stateInputPath;
  std::string stateOutputPath;
  std::size_t embeddingFeatures = 32;
  std::size_t clusterCount = 8;
  std::size_t clusterIterations = 25;
  double minPmi = 0.0;
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
    } else if (arg == "--graph-output" && i + 1 < argc) {
      opts.graphOutputPath = argv[++i];
    } else if (arg == "--state-in" && i + 1 < argc) {
      opts.stateInputPath = argv[++i];
    } else if (arg == "--state-out" && i + 1 < argc) {
      opts.stateOutputPath = argv[++i];
    } else if (arg == "--embedding-features" && i + 1 < argc) {
      opts.embeddingFeatures = static_cast<std::size_t>(std::stoull(argv[++i]));
    } else if (arg == "--clusters" && i + 1 < argc) {
      opts.clusterCount = static_cast<std::size_t>(std::stoull(argv[++i]));
    } else if (arg == "--cluster-iterations" && i + 1 < argc) {
      opts.clusterIterations = static_cast<std::size_t>(std::stoull(argv[++i]));
    } else if (arg == "--min-pmi" && i + 1 < argc) {
      opts.minPmi = std::stod(argv[++i]);
    } else if (arg == "--help" || arg == "-h") {
      std::cout << "Usage: slang_trainer --input contexts.tsv [--output model.json] [--min-count 2] [--top-tokens 12] "
                   "[--related-limit 5] [--graph-output graph.tsv] [--state-in stats.dat] [--state-out stats.dat] "
                   "[--embedding-features 32] [--clusters 8] [--cluster-iterations 25] [--min-pmi 0.0]\n";
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

double safeLog(double value) {
  if (value <= 0.0) {
    return -1e6;
  }
  return std::log(value);
}

double computePmi(std::uint64_t coCount, std::uint64_t phraseCount, std::uint64_t tokenCount, std::uint64_t totalContexts) {
  if (coCount == 0 || phraseCount == 0 || tokenCount == 0 || totalContexts == 0) {
    return -1e6;
  }
  double numerator = static_cast<double>(coCount) / static_cast<double>(totalContexts);
  double denominator = (static_cast<double>(phraseCount) / static_cast<double>(totalContexts)) *
                       (static_cast<double>(tokenCount) / static_cast<double>(totalContexts));
  return safeLog(numerator / denominator);
}

struct CorpusTotals {
  std::uint64_t totalContexts = 0;
  std::unordered_map<std::string, std::uint64_t> tokenTotals;
};

struct PhraseFeatureSummary {
  std::unordered_map<std::string, double> tokenPmi;
  double meanPositivePmi = 0.0;
  double variancePositivePmi = 0.0;
  double maxPositivePmi = 0.0;
  double positiveCount = 0.0;
};

PhraseFeatureSummary summarizePhrase(const PhraseStats &stat, const CorpusTotals &totals) {
  PhraseFeatureSummary summary;
  double sum = 0.0;
  double sumSq = 0.0;
  double maxPmi = 0.0;
  double count = 0.0;

  for (const auto &pair : stat.tokenCounts) {
    const std::string &token = pair.first;
    std::uint64_t tokenTotal = 0;
    auto tokIt = totals.tokenTotals.find(token);
    if (tokIt != totals.tokenTotals.end()) {
      tokenTotal = tokIt->second;
    }
    double pmi = computePmi(pair.second, stat.count, tokenTotal, totals.totalContexts);
    summary.tokenPmi[token] = pmi;
    if (pmi > 0.0) {
      sum += pmi;
      sumSq += pmi * pmi;
      count += 1.0;
      if (pmi > maxPmi)
        maxPmi = pmi;
    }
  }

  summary.maxPositivePmi = maxPmi;
  summary.positiveCount = count;
  if (count > 0.0) {
    summary.meanPositivePmi = sum / count;
    double meanSq = summary.meanPositivePmi * summary.meanPositivePmi;
    summary.variancePositivePmi = (sumSq / count) - meanSq;
    if (summary.variancePositivePmi < 0.0)
      summary.variancePositivePmi = 0.0;
  }

  return summary;
}

std::unordered_map<std::string, PhraseFeatureSummary>
summarizeAll(const std::unordered_map<std::string, PhraseStats> &stats, const CorpusTotals &totals) {
  std::unordered_map<std::string, PhraseFeatureSummary> out;
  for (const auto &entry : stats) {
    out[entry.first] = summarizePhrase(entry.second, totals);
  }
  return out;
}

struct QualityScores {
  double confidence = 0.0;
  double evidence = 0.0;
};

QualityScores computeQuality(const PhraseStats &stat, const PhraseFeatureSummary &featureSummary) {
  QualityScores q;
  q.confidence = 1.0 - std::exp(-static_cast<double>(stat.count) / 4.0);
  double meanPmi = featureSummary.meanPositivePmi > 0.0 ? featureSummary.meanPositivePmi : 0.0;
  q.evidence = meanPmi * std::log1p(static_cast<double>(stat.count));
  return q;
}

std::vector<std::string> selectEmbeddingTokens(const CorpusTotals &totals, std::size_t limit) {
  std::vector<std::pair<std::string, std::uint64_t>> entries(totals.tokenTotals.begin(), totals.tokenTotals.end());
  std::sort(entries.begin(), entries.end(), [](const auto &a, const auto &b) {
    if (a.second != b.second)
      return a.second > b.second;
    return a.first < b.first;
  });
  if (entries.size() > limit)
    entries.resize(limit);
  std::vector<std::string> tokens;
  tokens.reserve(entries.size());
  for (const auto &entry : entries) {
    tokens.push_back(entry.first);
  }
  return tokens;
}

std::unordered_map<std::string, std::vector<double>> buildEmbeddings(
    const std::unordered_map<std::string, PhraseStats> &stats,
    const std::unordered_map<std::string, PhraseFeatureSummary> &features,
    const std::vector<std::string> &vocab, std::uint64_t minCount, double minPmi) {
  std::unordered_map<std::string, std::vector<double>> embeddings;
  if (vocab.empty())
    return embeddings;
  for (const auto &entry : stats) {
    const auto &phrase = entry.first;
    const auto &stat = entry.second;
    if (stat.count < minCount)
      continue;
    std::vector<double> vec(vocab.size(), 0.0);
    auto featIt = features.find(phrase);
    if (featIt != features.end()) {
      for (std::size_t i = 0; i < vocab.size(); ++i) {
        const std::string &token = vocab[i];
        auto tokenIt = featIt->second.tokenPmi.find(token);
        if (tokenIt == featIt->second.tokenPmi.end())
          continue;
        double value = tokenIt->second;
        if (value >= minPmi)
          vec[i] = value;
      }
    }
    embeddings.emplace(phrase, std::move(vec));
  }
  return embeddings;
}

struct KMeansResult {
  bool valid = false;
  std::vector<int> assignments;
  std::vector<std::vector<double>> centroids;
  std::vector<std::string> phrases;
};

double squaredDistance(const std::vector<double> &a, const std::vector<double> &b) {
  double sum = 0.0;
  for (std::size_t i = 0; i < a.size(); ++i) {
    double d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

KMeansResult runKMeans(const std::unordered_map<std::string, std::vector<double>> &embeddings, std::size_t clusterCount,
                       std::size_t iterations) {
  KMeansResult result;
  if (clusterCount == 0 || embeddings.size() < clusterCount)
    return result;
  const std::size_t dim = embeddings.begin()->second.size();
  std::vector<std::vector<double>> data;
  std::vector<std::string> keys;
  data.reserve(embeddings.size());
  keys.reserve(embeddings.size());
  for (const auto &entry : embeddings) {
    data.push_back(entry.second);
    keys.push_back(entry.first);
  }
  std::vector<std::vector<double>> centroids;
  centroids.reserve(clusterCount);
  std::mt19937 rng(static_cast<unsigned int>(std::time(nullptr)));
  std::uniform_int_distribution<std::size_t> dist(0, data.size() - 1);
  std::unordered_set<std::size_t> used;
  while (centroids.size() < clusterCount) {
    std::size_t idx = dist(rng);
    if (used.insert(idx).second) {
      centroids.push_back(data[idx]);
    }
  }
  std::vector<int> assignments(data.size(), -1);
  for (std::size_t iter = 0; iter < iterations; ++iter) {
    bool changed = false;
    for (std::size_t i = 0; i < data.size(); ++i) {
      double bestDist = std::numeric_limits<double>::max();
      int bestCluster = -1;
      for (std::size_t c = 0; c < centroids.size(); ++c) {
        double d = squaredDistance(data[i], centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestCluster = static_cast<int>(c);
        }
      }
      if (assignments[i] != bestCluster) {
        assignments[i] = bestCluster;
        changed = true;
      }
    }
    if (!changed)
      break;
    std::vector<std::vector<double>> newCentroids(centroids.size(), std::vector<double>(dim, 0.0));
    std::vector<std::size_t> counts(centroids.size(), 0);
    for (std::size_t i = 0; i < data.size(); ++i) {
      int cluster = assignments[i];
      if (cluster < 0)
        continue;
      counts[cluster] += 1;
      for (std::size_t d = 0; d < dim; ++d) {
        newCentroids[cluster][d] += data[i][d];
      }
    }
    for (std::size_t c = 0; c < centroids.size(); ++c) {
      if (counts[c] == 0) {
        std::size_t idx = dist(rng);
        newCentroids[c] = data[idx];
        counts[c] = 1;
        continue;
      }
      double inv = 1.0 / static_cast<double>(counts[c]);
      for (double &value : newCentroids[c]) {
        value *= inv;
      }
    }
    centroids.swap(newCentroids);
  }

  result.valid = true;
  result.assignments = std::move(assignments);
  result.centroids = std::move(centroids);
  result.phrases = std::move(keys);
  return result;
}

bool loadState(const std::string &path, std::unordered_map<std::string, PhraseStats> &stats, CorpusTotals &totals) {
  if (path.empty())
    return false;
  std::ifstream in(path);
  if (!in)
    return false;
  std::string line;
  while (std::getline(in, line)) {
    if (line.empty() || line[0] == '#')
      continue;
    std::istringstream iss(line);
    std::string tag;
    iss >> tag;
    if (tag == "TOTAL") {
      iss >> totals.totalContexts;
    } else if (tag == "TOKEN_TOTAL") {
      std::string token;
      std::uint64_t count;
      iss >> std::quoted(token) >> count;
      totals.tokenTotals[token] = count;
    } else if (tag == "PHRASE") {
      std::string phrase;
      std::uint64_t count;
      double sum;
      iss >> std::quoted(phrase) >> count >> sum;
      PhraseStats &stat = stats[phrase];
      stat.count = count;
      stat.scoreSum = sum;
    } else if (tag == "PHRASE_REGION") {
      std::string phrase, region;
      std::uint64_t count;
      iss >> std::quoted(phrase) >> std::quoted(region) >> count;
      stats[phrase].regionCounts[region] = count;
    } else if (tag == "PHRASE_TOKEN") {
      std::string phrase, token;
      std::uint64_t count;
      iss >> std::quoted(phrase) >> std::quoted(token) >> count;
      stats[phrase].tokenCounts[token] = count;
    }
  }
  return true;
}

void saveState(const std::string &path, const std::unordered_map<std::string, PhraseStats> &stats,
               const CorpusTotals &totals) {
  if (path.empty())
    return;
  std::ofstream out(path);
  if (!out) {
    throw std::runtime_error("Failed to write state file: " + path);
  }
  out << "# SlangTrainerState v1\n";
  out << "TOTAL " << totals.totalContexts << "\n";
  for (const auto &token : totals.tokenTotals) {
    out << "TOKEN_TOTAL " << std::quoted(token.first) << ' ' << token.second << "\n";
  }
  for (const auto &entry : stats) {
    const auto &phrase = entry.first;
    const auto &stat = entry.second;
    out << "PHRASE " << std::quoted(phrase) << ' ' << stat.count << ' ' << std::setprecision(17) << stat.scoreSum
        << "\n";
    for (const auto &region : stat.regionCounts) {
      out << "PHRASE_REGION " << std::quoted(phrase) << ' ' << std::quoted(region.first) << ' ' << region.second
          << "\n";
    }
    for (const auto &token : stat.tokenCounts) {
      out << "PHRASE_TOKEN " << std::quoted(phrase) << ' ' << std::quoted(token.first) << ' ' << token.second << "\n";
    }
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


} // namespace

int main(int argc, char **argv) {
  try {
    Options options = parseOptions(argc, argv);

    std::ifstream in(options.inputPath);
    if (!in) {
      throw std::runtime_error("Failed to open input TSV: " + options.inputPath);
    }

    std::unordered_map<std::string, PhraseStats> stats;
    CorpusTotals totals;
    loadState(options.stateInputPath, stats, totals);
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
      totals.totalContexts += 1;
      std::unordered_set<std::string> uniqueTokens(tokens.begin(), tokens.end());
      for (const auto &token : uniqueTokens) {
        totals.tokenTotals[token] += 1;
      }
    }

    if (!options.stateOutputPath.empty()) {
      saveState(options.stateOutputPath, stats, totals);
    }

    auto featureSummaries = summarizeAll(stats, totals);
    auto embeddingTokens = selectEmbeddingTokens(totals, options.embeddingFeatures);
    auto embeddings =
        buildEmbeddings(stats, featureSummaries, embeddingTokens, options.minCount, options.minPmi);
    KMeansResult clusters = runKMeans(embeddings, options.clusterCount, options.clusterIterations);
    std::unordered_map<std::string, int> clusterLookup;
    if (clusters.valid) {
      for (std::size_t i = 0; i < clusters.phrases.size(); ++i) {
        clusterLookup[clusters.phrases[i]] = clusters.assignments[i];
      }
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
    out << "  \"summary\": {\"totalContexts\": " << totals.totalContexts << ", \"phraseCount\": " << stats.size() << "},\n";
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
      int clusterId = -1;
      if (clusters.valid) {
        auto itCluster = clusterLookup.find(phrase);
        if (itCluster != clusterLookup.end()) {
          clusterId = itCluster->second;
          out << "      \"cluster\": " << clusterId << ",\n";
        }
      }
      auto featIt = featureSummaries.find(phrase);
      PhraseFeatureSummary featureSummary = featIt != featureSummaries.end() ? featIt->second : PhraseFeatureSummary{};
      QualityScores quality = computeQuality(stat, featureSummary);
      out << "      \"quality\": {\"confidence\": " << std::fixed << std::setprecision(4) << quality.confidence
          << ", \"evidence\": " << std::fixed << std::setprecision(4) << quality.evidence << "},\n";
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
        double pmi = 0.0;
        auto pmiIt = featureSummary.tokenPmi.find(tokens[i].first);
        if (pmiIt != featureSummary.tokenPmi.end()) {
          pmi = pmiIt->second;
        } else {
          auto globalIter = totals.tokenTotals.find(tokens[i].first);
          std::uint64_t tokenTotal = globalIter != totals.tokenTotals.end() ? globalIter->second : 0;
          pmi = computePmi(tokens[i].second, stat.count, tokenTotal, totals.totalContexts);
        }
        out << "{\"token\": \"" << jsonEscape(tokens[i].first) << "\", \"count\": " << tokens[i].second
            << ", \"pmi\": " << std::fixed << std::setprecision(4) << pmi << "}";
      }
      out << "],\n";
      out.unsetf(std::ios_base::floatfield);

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
    if (clusters.valid) {
      out << ",\n  \"clusters\": [\n";
      for (std::size_t c = 0; c < clusters.centroids.size(); ++c) {
        if (c > 0)
          out << ",\n";
        std::vector<std::pair<std::string, double>> centroidTokens;
        for (std::size_t i = 0; i < embeddingTokens.size(); ++i) {
          centroidTokens.push_back({embeddingTokens[i], clusters.centroids[c][i]});
        }
        std::sort(centroidTokens.begin(), centroidTokens.end(), [](const auto &a, const auto &b) {
          if (a.second != b.second)
            return a.second > b.second;
          return a.first < b.first;
        });
        if (centroidTokens.size() > 8)
          centroidTokens.resize(8);
        std::size_t clusterSize = 0;
        for (int assignment : clusters.assignments) {
          if (assignment == static_cast<int>(c))
            clusterSize += 1;
        }
        out << "    {\n";
        out << "      \"id\": " << c << ",\n";
        out << "      \"size\": " << clusterSize << ",\n";
        out << "      \"centroidTokens\": [";
        for (std::size_t i = 0; i < centroidTokens.size(); ++i) {
          if (i > 0)
            out << ", ";
          out << "{\"token\": \"" << jsonEscape(centroidTokens[i].first) << "\", \"weight\": " << std::fixed
              << std::setprecision(4) << centroidTokens[i].second << "}";
        }
        out << "]\n";
        out << "    }";
      }
      out << "\n  ]\n";
    } else {
      out << "\n";
    }
    out << "}\n";
    std::cout << "Wrote language model summary to " << options.outputPath << "\n";

    if (!options.graphOutputPath.empty()) {
      std::ofstream graphOut(options.graphOutputPath);
      if (!graphOut) {
        throw std::runtime_error("Failed to open graph output file: " + options.graphOutputPath);
      }
      graphOut << "source\ttarget\tscore\n";
      for (const auto &pair : stats) {
        const auto &phrase = pair.first;
        const auto &stat = pair.second;
        if (stat.count < options.minCount)
          continue;
        auto related = relatedPhrases(phrase, stat, tokenIndex, options.relatedLimit);
        for (const auto &edge : related) {
          graphOut << phrase << '\t' << edge.first << '\t' << std::fixed << std::setprecision(4) << edge.second << '\n';
        }
      }
      std::cout << "Wrote related phrase graph to " << options.graphOutputPath << "\n";
    }
  } catch (const std::exception &ex) {
    std::cerr << "Error: " << ex.what() << "\n";
    return 1;
  }
  return 0;
}
