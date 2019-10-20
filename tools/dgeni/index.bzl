"""
  Implementation of the "docs" rule. The implementation runs Dgeni with the
  specified entry points and outputs the API docs into a package relative directory.
"""

load("@build_bazel_rules_nodejs//:providers.bzl", "node_modules_aspect", "NpmPackageInfo")
load("@npm_bazel_typescript//internal:common/compilation.bzl", "DEPS_ASPECTS")

DocSources = provider(
    doc = "Provides sources for docs",
    fields = {
        "docs": "Output of docs",
        "name": "Name of the doc",
        "list": "Json formatted doc list",
    },
)

def _docs(ctx):
    doc_name = ctx.label.name
    doc_label_directory = ctx.label.package

    doc_output_directory = "%s/%s/%s" % (ctx.bin_dir.path, doc_label_directory, doc_name)

    # sources will be available in building context.
    sources = depset()

    # module mappings of deps
    mappings = dict()

    for dep in ctx.attr.deps:
        if NpmPackageInfo in dep:
            # Dependencies from node_module should appear in execroot.
            node_module = dep[NpmPackageInfo]
            sources = depset(transitive = [sources, node_module.sources])
        if hasattr(dep, "typescript"):
            # We need to pass all transitive deps as well to let typescript resolve everything.
            sources = depset(transitive = [sources, dep.typescript.transitive_declarations])
        if hasattr(dep, "es6_module_mappings"):
            # We need to pass mappings to paths of dgeni
            mappings.update(dep.es6_module_mappings)

    # Make source files available in execution
    sources = depset(transitive = [sources, depset(ctx.files.srcs)])

    # Doc list of this target that created by dgeni.
    doc_list = ctx.actions.declare_file("%s/%s" % (doc_name, "doc-list.json"))

    # Doc files that must be  generated by this rule.
    expected_docs = [doc_list]

    # Expected symbols
    expected_symbols = []

    for symbol in ctx.attr.exports:
        expected_docs += [
            ctx.actions.declare_file("%s/%s.html" % (doc_name, symbol)),
        ]
        expected_symbols += [symbol]

    for sourceFile in ctx.files.srcs:
        if not ctx.attr.exports and sourceFile.basename.endswith(".ts"):
            fail("You have to specify exports, if you have typescript files.")
        elif sourceFile.basename.endswith(".md"):
            name = sourceFile.basename.replace(sourceFile.basename[-3:], "")
            expected_symbols += [name]
            expected_docs += [
                ctx.actions.declare_file("%s/%s.html" % (doc_name, name)),
            ]

    data = []

    for doc in ctx.attr.data:
        if DocSources in doc:
            docSource = doc[DocSources]
            docSourcePath = "%s/%s" % (doc.label.package, doc.label.name)

            # Make docs available in execution context
            sources = depset([docSource.list], transitive = [sources, docSource.docs])
            docFiles = []
            for docFile in docSource.docs.to_list():
                docFiles.append(docFile.short_path)
                expected_docs.append(ctx.actions.declare_file("%s/%s/%s" % (doc_name, docSource.name, docFile.short_path.replace(docSourcePath, ""))))
            data.append(struct(name = docSource.name, list = docSource.list.short_path, docs = docFiles, path = docSourcePath))

    args = ctx.actions.args()
    args.use_param_file("%s", use_always = True)
    args.set_param_file_format(format = "multiline")
    args.add(ctx.label.package.split("/")[-1])
    args.add(doc_output_directory)
    args.add_joined(ctx.files.srcs, join_with = ",", omit_if_empty = False)
    args.add_joined(expected_symbols, join_with = ",", omit_if_empty = False)
    args.add(mappings)
    args.add(ctx.bin_dir.path)
    args.add(struct(data = data).to_json())

    ctx.actions.run(
        inputs = ctx.files._dgeni_templates + sources.to_list(),
        tools = sources,
        executable = ctx.executable._dgeni_bin,
        outputs = expected_docs,
        arguments = [args],
        progress_message = "Docs %s (%s)" % (doc_label_directory, ctx.attr.name),
    )

    generated_docs = depset(expected_docs)

    return [DefaultInfo(files = generated_docs), DocSources(docs = generated_docs, name = ctx.label.package.split("/")[-1], list = doc_list)]

"""
  Rule definition for the "docs" rule that can generate API documentation
  for specified packages and their entry points.
"""
docs = rule(
    implementation = _docs,
    attrs = {
        "data": attr.label_list(
            default = [],
            allow_files = True,
            doc = "Other doc targets to bundle",
        ),
        "exports": attr.string_list(
            doc = "Expected doc files to be built in this target",
        ),
        "srcs": attr.label_list(
            doc = "The TypeScript and Markdown files to compile.",
            allow_files = [".ts", ".md"],
        ),
        "deps": attr.label_list(
            aspects = DEPS_ASPECTS + [node_modules_aspect],
            doc = "Compile-time dependencies, typically other ts_library targets",
        ),
        "flat": attr.bool(
            doc = "Whether docs should be in package directory",
            default = False,
        ),
        "_dgeni_templates": attr.label(
            default = Label("//tools/dgeni/templates"),
        ),
        "_dgeni_bin": attr.label(
            default = Label("//tools/dgeni"),
            executable = True,
            cfg = "host",
        ),
    },
)
