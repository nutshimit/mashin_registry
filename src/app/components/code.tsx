import { useEffect, useMemo, useState } from "preact/hooks";
import sanitize from "sanitize-html";
import { marked } from "marked";

export default function Code({
  code,
  language,
}: {
  code: string;
  language: "markdown" | "typescript";
}) {
  const [isReady, setReady] = useState(false);
  useEffect(() => {
    if (language === "typescript") {
      // @ts-expect-error
      hljs.highlightAll();
    }
    setReady(true);
  }, [language, isReady]);

  const finalCode = useMemo(() => {
    if (language === "markdown") {
      return sanitize(marked.parse(code, { gfm: true }));
    }

    return code;
  }, [code, language]);

  if (!isReady) {
    return <></>;
  }

  return language === "typescript" ? (
    <pre>
      <code className={`language-${language}`}>{code}</code>
    </pre>
  ) : (
    <div className="p-4 bg-white">
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: finalCode }}
      />
    </div>
  );
}
