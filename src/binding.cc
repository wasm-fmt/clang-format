#include "lib.h"
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(my_module) {
  enum_<ResultStatus>("ResultStatus")
      .value("Success", ResultStatus::Success)
      .value("Error", ResultStatus::Error)
      .value("Unchanged", ResultStatus::Unchanged);

  value_object<Result>("Result")
      .field("status", &Result::status)
      .field("content", &Result::content);

  class_<ClangFormat>("ClangFormat")
      .constructor()
      .function("with_style", &ClangFormat::with_style, allow_raw_pointers())
      .function("with_fallback_style", &ClangFormat::with_fallback_style,
                allow_raw_pointers())
      .function("format", &ClangFormat::format)
      .function("format_range", &ClangFormat::format_range)
      .function("format_line", &ClangFormat::format_line)
      .class_function("version", &ClangFormat::version)
      .class_function("dump_config", &ClangFormat::dump_config);
}
