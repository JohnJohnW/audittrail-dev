interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 text-gray-400">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <div className="flex gap-3 justify-center">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <a
              href={secondaryAction.href}
              onClick={secondaryAction.onClick}
              className="inline-flex items-center bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {secondaryAction.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
