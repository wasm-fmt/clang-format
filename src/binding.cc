#include "lib.h"
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(my_module) {
  register_vector<unsigned>("RangeList");

  value_object<Result>("Result")
      .field("error", &Result::error)
      .field("content", &Result::content);

  function<std::string>("version", &version);
  function<Result, const std::string, const std::string, const std::string>(
      "format", &format);
  function<Result, const std::string, const std::string, const std::string,
           const std::vector<unsigned>>("format_byte", &format_byte);
  function<Result, const std::string, const std::string, const std::string,
           const std::vector<unsigned>>("format_line", &format_line);
  function<void, const std::string>("set_fallback_style", &set_fallback_style);
  function<void, bool>("set_sort_includes", &set_sort_includes);
  function<Result, const std::string, const std::string, const std::string>(
      "dump_config", &dump_config);
}

int main(void) {}
