export default function PanelIcon({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <rect x="2.5" y="4" width="15" height="12" rx="3" />
      <path d="M8 4v12" />
      {collapsed ? (
        <path d="M11.2 8.2 13.2 10l-2 1.8" />
      ) : (
        <path d="M13.2 8.2 11.2 10l2 1.8" />
      )}
    </svg>
  );
}
