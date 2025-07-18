import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface PrivacyAcknowledgementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
}

export default function PrivacyAcknowledgementModal({ 
  isOpen, 
  onClose, 
  onAcknowledge 
}: PrivacyAcknowledgementModalProps): JSX.Element {
  
  const handleAcknowledge = () => {
    onAcknowledge();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-xl">Your Privacy Matters</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <p className="font-medium text-gray-800">
            Toast is a safe space for your personal reflections.
          </p>
          
          <ul className="space-y-2 list-disc list-inside">
            <li>Only your first name and email are collected.</li>
            <li>Your reflections stay private — no one else can read them.</li>
            <li>Data is securely stored and used only to create your weekly toast.</li>
            <li>You can delete your data at any time.</li>
          </ul>
          
          <p className="text-center text-gray-500 italic">
            Thanks for trusting us while we're still in testing.
          </p>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleAcknowledge}
            className="w-full"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}