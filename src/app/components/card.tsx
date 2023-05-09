import { VNode, ComponentChildren } from "preact";

export default function Card({
  header,
  children,
  className,
}: {
  header?: VNode;
  children: ComponentChildren;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden bg-white sm:rounded-lg sm:shadow ${className}`}
    >
      {header && (
        <div className="border-b border-gray-200 flex flex-wrap items-center justify-between sm:flex-nowrap">
          {header}
        </div>
      )}
      <div className="divide-y divide-gray-200">{children}</div>
    </div>
  );
}
