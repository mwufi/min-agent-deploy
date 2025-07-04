interface AccountIndicatorProps {
  email: string;
  action?: string;
}

export function AccountIndicator({ email, action }: AccountIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs">
      <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center">
        <span className="text-red-600 text-xs font-bold">G</span>
      </div>
      <span className="text-gray-700">
        {action ? `${action} from` : 'Using'}: <span className="font-medium">{email}</span>
      </span>
    </div>
  );
}