//===-- clang-format/ClangFormat.cpp - Clang format tool ------------------===//
//
// Part of the LLVM Project, under the Apache License v2.0 with LLVM Exceptions.
// See https://llvm.org/LICENSE.txt for license information.
// SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception
//
//===----------------------------------------------------------------------===//
///
/// \file
/// This file implements a clang-format tool that automatically formats
/// (fragments of) C++ code.
///
//===----------------------------------------------------------------------===//

#include "lib.h"
#include "clang/Basic/FileManager.h"
#include "clang/Basic/SourceManager.h"
#include "clang/Basic/Version.h"
#include "clang/Format/Format.h"
#include "clang/Rewrite/Core/Rewriter.h"

using namespace llvm;
using clang::tooling::Replacements;

namespace clang {
namespace format {

static auto createInMemoryFile(StringRef FileName, MemoryBufferRef Source,
                               SourceManager &Sources, FileManager &Files,
                               llvm::vfs::InMemoryFileSystem *MemFS) -> FileID {
  MemFS->addFileNoOwn(FileName, 0, Source);
  auto File = Files.getOptionalFileRef(FileName);
  assert(File && "File not added to MemFS?");
  return Sources.createFileID(*File, SourceLocation(), SrcMgr::C_User);
}

static auto fillRanges(MemoryBuffer *Code, std::vector<tooling::Range> &Ranges)
    -> void {
  Ranges.push_back(tooling::Range(0, Code->getBuffer().size()));
}

static auto isPredefinedStyle(StringRef style) -> bool {
  return StringSwitch<bool>(style.lower())
      .Cases("llvm", "chromium", "mozilla", "google", "webkit", "gnu",
             "microsoft", "none", "file", true)
      .Default(false);
}

static auto format_range(const std::unique_ptr<llvm::MemoryBuffer> code,
                         const std::string assumedFileName,
                         const std::string style,
                         const std::string fallback_style,
                         std::vector<tooling::Range> ranges) -> Result {
  StringRef BufStr = code->getBuffer();

  const char *InvalidBOM = SrcMgr::ContentCache::getInvalidBOM(BufStr);

  if (InvalidBOM) {
    std::stringstream err;
    err << "encoding with unsupported byte order mark \"" << InvalidBOM
        << "\" detected.";

    return Result::error(err.str());
  }

  StringRef AssumedFileName = assumedFileName;
  if (AssumedFileName.empty())
    AssumedFileName = "<stdin>";

  IntrusiveRefCntPtr<llvm::vfs::InMemoryFileSystem> InMemoryFileSystem(
      new llvm::vfs::InMemoryFileSystem);
  FileManager Files(FileSystemOptions(), InMemoryFileSystem);

  DiagnosticOptions DiagOpts;
  DiagnosticsEngine Diagnostics(
      IntrusiveRefCntPtr<DiagnosticIDs>(new DiagnosticIDs), DiagOpts);
  SourceManager Sources(Diagnostics, Files);

  StringRef _style = style;

  if (!_style.starts_with("{") && !isPredefinedStyle(_style)) {
    std::unique_ptr<llvm::MemoryBuffer> DotClangFormat =
        MemoryBuffer::getMemBuffer(style);

    createInMemoryFile(".clang-format", *DotClangFormat.get(), Sources, Files,
                       InMemoryFileSystem.get());
    _style = "file:.clang-format";
  }

  llvm::Expected<format::FormatStyle> FormatStyle =
      format::getStyle(_style, AssumedFileName, fallback_style,
                       code->getBuffer(), InMemoryFileSystem.get(), false);

  InMemoryFileSystem.reset();

  if (!FormatStyle) {
    std::string err = llvm::toString(FormatStyle.takeError());
    return Result::error(err);
  }

  unsigned CursorPosition = 0;
  tooling::Replacements Replaces =
      format::sortIncludes(*FormatStyle, code->getBuffer(), ranges,
                           AssumedFileName, &CursorPosition);

  // To format JSON insert a variable to trick the code into thinking its
  // JavaScript.
  if (FormatStyle->isJson() && !FormatStyle->DisableFormat) {
    auto err =
        Replaces.add(tooling::Replacement(AssumedFileName, 0, 0, "x = "));
    if (err)
      return Result::error("Bad Json variable insertion");
  }

  auto ChangedCode =
      cantFail(tooling::applyAllReplacements(code->getBuffer(), Replaces));

  // Get new affected ranges after sorting `#includes`.
  ranges = tooling::calculateRangesAfterReplacements(Replaces, ranges);
  format::FormattingAttemptStatus Status;
  tooling::Replacements FormatChanges = format::reformat(
      *FormatStyle, ChangedCode, ranges, AssumedFileName, &Status);
  Replaces = Replaces.merge(FormatChanges);

  std::string result =
      cantFail(tooling::applyAllReplacements(code->getBuffer(), Replaces));

  if (Status.FormatComplete && result == code->getBuffer().str())
    return Result::unchanged();

  return Result::ok(result);
}

} // namespace format
} // namespace clang

ClangFormat::ClangFormat()
    : style_(clang::format::DefaultFormatStyle),
      fallback_style_(clang::format::DefaultFallbackStyle) {}

auto ClangFormat::with_style(const std::string style) -> ClangFormat * {
  style_ = style;
  return this;
}

auto ClangFormat::with_fallback_style(const std::string style)
    -> ClangFormat * {
  fallback_style_ = style;
  return this;
}

auto ClangFormat::format(const std::string code, const std::string filename)
    -> Result {
  ErrorOr<std::unique_ptr<MemoryBuffer>> CodeOrErr =
      MemoryBuffer::getMemBuffer(code);

  if (std::error_code EC = CodeOrErr.getError())
    return Result::error(EC.message());
  std::unique_ptr<llvm::MemoryBuffer> Code = std::move(CodeOrErr.get());
  if (Code->getBufferSize() == 0)
    return Result::unchanged();

  std::vector<clang::tooling::Range> Ranges;
  clang::format::fillRanges(Code.get(), Ranges);

  return clang::format::format_range(std::move(Code), filename, style_,
                                     fallback_style_, std::move(Ranges));
}

auto ClangFormat::format_range(const std::string code,
                               const std::string filename, unsigned offset,
                               unsigned length) -> Result {
  ErrorOr<std::unique_ptr<MemoryBuffer>> CodeOrErr =
      MemoryBuffer::getMemBuffer(code);

  if (std::error_code EC = CodeOrErr.getError())
    return Result::error(EC.message());
  std::unique_ptr<llvm::MemoryBuffer> Code = std::move(CodeOrErr.get());
  if (Code->getBufferSize() == 0)
    return Result::unchanged();

  std::vector<clang::tooling::Range> Ranges;

  IntrusiveRefCntPtr<llvm::vfs::InMemoryFileSystem> InMemoryFileSystem(
      new llvm::vfs::InMemoryFileSystem);
  clang::FileManager Files(clang::FileSystemOptions(), InMemoryFileSystem);
  clang::DiagnosticOptions DiagOpts;
  clang::DiagnosticsEngine Diagnostics(
      IntrusiveRefCntPtr<clang::DiagnosticIDs>(new clang::DiagnosticIDs),
      DiagOpts);
  clang::SourceManager Sources(Diagnostics, Files);
  clang::FileID ID = clang::format::createInMemoryFile(
      "<irrelevant>", *Code, Sources, Files, InMemoryFileSystem.get());

  if (length == 0) {
    if (offset >= Code->getBufferSize()) {
      std::stringstream err;
      err << "offset " << offset << " is outside the file";
      return Result::error(err.str());
    }
    clang::SourceLocation Start =
        Sources.getLocForStartOfFile(ID).getLocWithOffset(offset);
    clang::SourceLocation End = Sources.getLocForEndOfFile(ID);

    unsigned Offset = Sources.getFileOffset(Start);
    unsigned Length = Sources.getFileOffset(End) - Offset;

    Ranges.push_back(clang::tooling::Range(Offset, Length));
  } else {
    if (offset >= Code->getBufferSize()) {
      std::stringstream err;
      err << "offset " << offset << " is outside the file";
      return Result::error(err.str());
    }

    unsigned end = offset + length;
    if (end > Code->getBufferSize()) {
      std::stringstream err;
      err << "invalid length " << length << ", offset + length (" << end
          << ") is outside the file.";
      return Result::error(err.str());
    }

    clang::SourceLocation Start =
        Sources.getLocForStartOfFile(ID).getLocWithOffset(offset);
    clang::SourceLocation End = Start.getLocWithOffset(length);

    unsigned Offset = Sources.getFileOffset(Start);
    unsigned Length = Sources.getFileOffset(End) - Offset;

    Ranges.push_back(clang::tooling::Range(Offset, Length));
  }

  return clang::format::format_range(
      std::move(Code), filename, style_, fallback_style_, std::move(Ranges));
}

auto ClangFormat::format_line(const std::string code,
                              const std::string filename, unsigned from_line,
                              unsigned to_line) -> Result {
  ErrorOr<std::unique_ptr<MemoryBuffer>> CodeOrErr =
      MemoryBuffer::getMemBuffer(code);

  if (std::error_code EC = CodeOrErr.getError())
    return Result::error(EC.message());
  std::unique_ptr<llvm::MemoryBuffer> Code = std::move(CodeOrErr.get());
  if (Code->getBufferSize() == 0)
    return Result::unchanged();

  if (from_line < 1)
    return Result::error("start line should be at least 1");
  if (from_line > to_line)
    return Result::error("start line should not exceed end line");

  std::vector<clang::tooling::Range> Ranges;

  IntrusiveRefCntPtr<llvm::vfs::InMemoryFileSystem> InMemoryFileSystem(
      new llvm::vfs::InMemoryFileSystem);
  clang::FileManager Files(clang::FileSystemOptions(), InMemoryFileSystem);
  clang::DiagnosticOptions DiagOpts;
  clang::DiagnosticsEngine Diagnostics(
      IntrusiveRefCntPtr<clang::DiagnosticIDs>(new clang::DiagnosticIDs),
      DiagOpts);
  clang::SourceManager Sources(Diagnostics, Files);
  clang::FileID ID = clang::format::createInMemoryFile(
      "<irrelevant>", *Code, Sources, Files, InMemoryFileSystem.get());

  const auto Start = Sources.translateLineCol(ID, from_line, 1);
  const auto End = Sources.translateLineCol(ID, to_line, UINT_MAX);
  if (Start.isInvalid() || End.isInvalid())
    return Result::error("invalid line range");

  const auto Offset = Sources.getFileOffset(Start);
  const auto Length = Sources.getFileOffset(End) - Offset;

  Ranges.push_back(clang::tooling::Range(Offset, Length));

  return clang::format::format_range(
      std::move(Code), filename, style_, fallback_style_, std::move(Ranges));
}

auto ClangFormat::version() -> std::string {
  return clang::getClangToolFullVersion("clang-format");
}

auto ClangFormat::dump_config(const std::string style,
                              const std::string filename,
                              const std::string code) -> Result {
  llvm::Expected<clang::format::FormatStyle> FormatStyle =
      clang::format::getStyle(style, filename,
                              clang::format::DefaultFallbackStyle, code);
  if (!FormatStyle)
    return Result::error(llvm::toString(FormatStyle.takeError()));
  std::string Config = clang::format::configurationAsText(*FormatStyle);
  return Result::ok(Config);
}
