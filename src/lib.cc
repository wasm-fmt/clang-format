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

#include <emscripten/bind.h>
#include <sstream>
#include "clang/Basic/Diagnostic.h"
#include "clang/Basic/DiagnosticOptions.h"
#include "clang/Basic/FileManager.h"
#include "clang/Basic/SourceManager.h"
#include "clang/Basic/Version.h"
#include "clang/Format/Format.h"
#include "clang/Rewrite/Core/Rewriter.h"

using namespace llvm;
using clang::tooling::Replacements;

static std::string Style{clang::format::DefaultFormatStyle};

static std::string FallbackStyle{clang::format::DefaultFallbackStyle};

static std::string AssumeFileName{"<stdin>"};

static unsigned Cursor{0};

static bool SortIncludes{false};

static std::string QualifierAlignment{""};

static std::string Files{""};

// Emulate being able to turn on/off the warning.
static bool WarnFormat{true};

static bool NoWarnFormat{};

static unsigned ErrorLimit{0};

static bool WarningsAsErrors{};

static bool ShowColors{true};

static bool NoShowColors{false};

namespace clang {
namespace format {

static FileID createInMemoryFile(StringRef FileName,
                                 MemoryBufferRef Source,
                                 SourceManager& Sources,
                                 FileManager& Files,
                                 llvm::vfs::InMemoryFileSystem* MemFS) {
    MemFS->addFileNoOwn(FileName, 0, Source);
    auto File = Files.getOptionalFileRef(FileName);
    assert(File && "File not added to MemFS?");
    return Sources.createFileID(*File, SourceLocation(), SrcMgr::C_User);
}

static auto fillRanges(MemoryBuffer* Code, std::vector<tooling::Range>& Ranges) -> void {
    IntrusiveRefCntPtr<llvm::vfs::InMemoryFileSystem> InMemoryFileSystem(new llvm::vfs::InMemoryFileSystem);
    FileManager Files(FileSystemOptions(), InMemoryFileSystem);
    DiagnosticsEngine Diagnostics(IntrusiveRefCntPtr<DiagnosticIDs>(new DiagnosticIDs), new DiagnosticOptions);
    SourceManager Sources(Diagnostics, Files);
    FileID ID = createInMemoryFile("<irrelevant>", *Code, Sources, Files, InMemoryFileSystem.get());

    SourceLocation Start = Sources.getLocForStartOfFile(ID).getLocWithOffset(0);
    SourceLocation End = Sources.getLocForEndOfFile(ID);

    unsigned Offset = Sources.getFileOffset(Start);
    unsigned Length = Sources.getFileOffset(End) - Offset;
    Ranges.push_back(tooling::Range(Offset, Length));
}

class ClangFormatDiagConsumer : public DiagnosticConsumer {
    virtual void anchor() {}

    void HandleDiagnostic(DiagnosticsEngine::Level DiagLevel, const Diagnostic& Info) override {
        SmallVector<char, 16> vec;
        Info.FormatDiagnostic(vec);
        llvm::errs() << "clang-format error:" << vec << "\n";
    }
};

// Returns true on error.
static auto format(const std::string str, const std::string assumedFileName, const std::string style) -> std::string {
    ErrorOr<std::unique_ptr<MemoryBuffer>> CodeOrErr = MemoryBuffer::getMemBuffer(str);

    if (std::error_code EC = CodeOrErr.getError()) {
        std::string err = EC.message();
        llvm::errs() << err << "\n";
        return "\0" + err;
    }
    std::unique_ptr<llvm::MemoryBuffer> Code = std::move(CodeOrErr.get());
    if (Code->getBufferSize() == 0)
        return "";  // Empty files are formatted correctly.

    StringRef BufStr = Code->getBuffer();

    const char* InvalidBOM = SrcMgr::ContentCache::getInvalidBOM(BufStr);

    if (InvalidBOM) {
        std::stringstream err;
        err << "error: encoding with unsupported byte order mark \"" << InvalidBOM << "\" detected.";

        llvm::errs() << err.str() << "\n";
        return "\0" + err.str();
    }

    std::vector<tooling::Range> Ranges;
    fillRanges(Code.get(), Ranges);

    StringRef AssumedFileName = assumedFileName;
    if (AssumedFileName.empty()) {
        std::string err = "error: no file name given";
        llvm::errs() << err << "\n";
        return "\0" + err;
    }

    llvm::Expected<FormatStyle> FormatStyle =
        getStyle(style, AssumedFileName, FallbackStyle, Code->getBuffer(), nullptr, false);
    if (!FormatStyle) {
        std::string err = llvm::toString(FormatStyle.takeError());
        llvm::errs() << err << "\n";
        return "\0" + err;
    }

    StringRef QualifierAlignmentOrder = QualifierAlignment;

    FormatStyle->QualifierAlignment =
        StringSwitch<FormatStyle::QualifierAlignmentStyle>(QualifierAlignmentOrder.lower())
            .Case("right", FormatStyle::QAS_Right)
            .Case("left", FormatStyle::QAS_Left)
            .Default(FormatStyle->QualifierAlignment);

    if (FormatStyle->QualifierAlignment == FormatStyle::QAS_Left) {
        FormatStyle->QualifierOrder = {"const", "volatile", "type"};
    } else if (FormatStyle->QualifierAlignment == FormatStyle::QAS_Right) {
        FormatStyle->QualifierOrder = {"type", "const", "volatile"};
    } else if (QualifierAlignmentOrder.contains("type")) {
        FormatStyle->QualifierAlignment = FormatStyle::QAS_Custom;
        SmallVector<StringRef> Qualifiers;
        QualifierAlignmentOrder.split(Qualifiers, " ", /*MaxSplit=*/-1,
                                      /*KeepEmpty=*/false);
        FormatStyle->QualifierOrder = {Qualifiers.begin(), Qualifiers.end()};
    }

    if (SortIncludes)
        FormatStyle->SortIncludes = FormatStyle::SI_CaseSensitive;
    else
        FormatStyle->SortIncludes = FormatStyle::SI_Never;

    unsigned CursorPosition = Cursor;
    Replacements Replaces = sortIncludes(*FormatStyle, Code->getBuffer(), Ranges, AssumedFileName, &CursorPosition);

    // To format JSON insert a variable to trick the code into thinking its
    // JavaScript.
    if (FormatStyle->isJson() && !FormatStyle->DisableFormat) {
        auto Err = Replaces.add(tooling::Replacement(tooling::Replacement(AssumedFileName, 0, 0, "x = ")));
        if (Err)
            llvm::errs() << "Bad Json variable insertion\n";
    }

    auto ChangedCode = tooling::applyAllReplacements(Code->getBuffer(), Replaces);
    if (!ChangedCode) {
        std::string err = llvm::toString(ChangedCode.takeError());
        llvm::errs() << err << "\n";
        return "\0" + err;
    }
    // Get new affected ranges after sorting `#includes`.
    Ranges = tooling::calculateRangesAfterReplacements(Replaces, Ranges);
    FormattingAttemptStatus Status;
    Replacements FormatChanges = reformat(*FormatStyle, *ChangedCode, Ranges, AssumedFileName, &Status);
    Replaces = Replaces.merge(FormatChanges);

    IntrusiveRefCntPtr<llvm::vfs::InMemoryFileSystem> InMemoryFileSystem(new llvm::vfs::InMemoryFileSystem);
    FileManager Files(FileSystemOptions(), InMemoryFileSystem);

    IntrusiveRefCntPtr<DiagnosticOptions> DiagOpts(new DiagnosticOptions());
    ClangFormatDiagConsumer IgnoreDiagnostics;
    DiagnosticsEngine Diagnostics(IntrusiveRefCntPtr<DiagnosticIDs>(new DiagnosticIDs), &*DiagOpts, &IgnoreDiagnostics,
                                  false);
    SourceManager Sources(Diagnostics, Files);
    FileID ID = createInMemoryFile(AssumedFileName, *Code, Sources, Files, InMemoryFileSystem.get());
    Rewriter Rewrite(Sources, LangOptions());
    tooling::applyAllReplacements(Replaces, Rewrite);

    auto& buf = Rewrite.getEditBuffer(ID);

    return std::string(buf.begin(), buf.end());
}

}  // namespace format
}  // namespace clang

auto version() -> std::string {
    return clang::getClangToolFullVersion("clang-format");
}

auto format(const std::string str, const std::string assumedFileName) -> std::string {
    return clang::format::format(str, assumedFileName, clang::format::DefaultFallbackStyle);
}

auto format(const std::string str, const std::string assumedFileName, const std::string style) -> std::string {
    return clang::format::format(str, assumedFileName, style);
}

using namespace emscripten;

EMSCRIPTEN_BINDINGS(my_module) {
    function<std::string>("version", &version);
    function<std::string, const std::string, const std::string>("format", &format);
    function<std::string, const std::string, const std::string, const std::string>("format_with_style", &format);
}

auto main(int argc, const char** argv) -> int {
    return 0;
}
