import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownRender({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  return (
    <div className={cn("markdown-body text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
