#ifndef CLANG_FORMAT_WASM_LIB_H_
#define CLANG_FORMAT_WASM_LIB_H_
#include <sstream>

enum class ResultStatus { Success, Error, Unchanged };

struct Result {
  ResultStatus status;
  std::string content;

  static Result ok(const std::string content) {
    return {ResultStatus::Success, std::move(content)};
  }

  static Result unchanged() { return {ResultStatus::Unchanged, ""}; }

  static Result error(const std::string content) {
    return {ResultStatus::Error, std::move(content)};
  }
};

class ClangFormat {
public:
  ClangFormat();
  ClangFormat *with_style(const std::string style);
  ClangFormat *with_fallback_style(const std::string style);
  Result format(const std::string code, const std::string filename);
  Result format_range(const std::string code, const std::string filename,
                      unsigned offset, unsigned length);
  Result format_line(const std::string code, const std::string filename,
                     unsigned from_line, unsigned to_line);

  static std::string version();
  static Result dump_config(const std::string style, const std::string filename,
                            const std::string code);

private:
  std::string style_;
  std::string fallback_style_;
};

#endif
