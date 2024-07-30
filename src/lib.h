#ifndef CLANG_FORMAT_WASM_LIB_H_
#define CLANG_FORMAT_WASM_LIB_H_
#include <sstream>

struct Result {
    bool error;
    std::string content;
};

auto version() -> std::string;
auto format(const std::string str, const std::string assumedFileName, const std::string style) -> Result;
auto format_byte(const std::string str,
                 const std::string assumedFileName,
                 const std::string style,
                 const std::vector<unsigned> ranges) -> Result;
auto format_line(const std::string str,
                 const std::string assumedFileName,
                 const std::string style,
                 const std::vector<unsigned> ranges) -> Result;
auto set_fallback_style(const std::string style) -> void;

#endif
