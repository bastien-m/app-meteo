import { Eye, EyeOff, X } from "lucide-react";
import { Badge } from "../ui/badge";

type StationBadgeProps = {
  label: string;
  shown?: boolean;
  toggleShow?: () => void;
  removeFromSelection?: () => void;
};
export function StationBadge({
  label,
  shown = true,
  toggleShow = () => {},
  removeFromSelection = () => {},
}: StationBadgeProps) {
  return (
    <Badge variant="outline">
      <div className="flex items-center gap-1">
        <div className="hover:cursor-pointer" onClick={toggleShow}>
          {shown ? <Eye size="1em" /> : <EyeOff size="1em" />}
        </div>
        {label}
        <div className="hover:cursor-pointer">
          <X size="1em" onClick={removeFromSelection} />
        </div>
      </div>
    </Badge>
  );
}
