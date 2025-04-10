
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: 'pending' | 'completed' | 'rejected';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // Added safer handling with default status
  const safeStatus = status || 'pending';
  
  switch (safeStatus) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case 'completed':
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
    default:
      return <Badge variant="outline">{safeStatus}</Badge>;
  }
}
