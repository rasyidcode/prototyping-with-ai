import { Siren, X } from 'lucide-react';
import Button from './Button.jsx';

export default function SosButton({ active, sos, onTrigger, onClear }) {
  if (!active) return null;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Button className="min-h-14 text-base" onClick={onTrigger} variant="danger">
        <Siren className="h-5 w-5" />
        SOS emergency
      </Button>
      {sos && (
        <Button className="min-h-14 text-base" onClick={onClear} variant="secondary">
          <X className="h-5 w-5" />
          Clear SOS
        </Button>
      )}
    </div>
  );
}
