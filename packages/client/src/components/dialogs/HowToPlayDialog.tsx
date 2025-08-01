import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type HowToPlayDialogProps = {
  isHelpDialogOpen: boolean;
  setIsHelpDialogOpen: (open: boolean) => void;
};

export const HowToPlayDialog: React.FC<HowToPlayDialogProps> = ({
  setIsHelpDialogOpen,
  isHelpDialogOpen,
}) => {
  return (
    <Dialog
      onOpenChange={open => setIsHelpDialogOpen(open)}
      open={isHelpDialogOpen}
    >
      <DialogContent
        aria-describedby={undefined}
        className="bg-gray-900/95 border border-purple-900/50 h-[90vh] max-w-lg text-white"
      >
        <DialogHeader>
          <DialogTitle className="font-bold text-purple-400 text-2xl">
            HOW TO PLAY
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4 pr-2 pb-2 max-h-[80vh] overflow-y-auto">
          <div>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">
              Overview
            </h2>
            <p className="text-gray-300">
              Auto Tower Defense builds off of concepts of{' '}
              <span className="text-white font-semibold">
                Autonomous Worlds
              </span>{' '}
              and{' '}
              <span className="text-white font-semibold">Digital Physics</span>.
            </p>
            <p className="mt-4 text-gray-300">
              The primary way of playing the game is by{' '}
              <span className="text-white font-semibold">
                modifying your towers
              </span>
              . For instance, you can change the formula for your tower&apos;s
              projectile trajectory, which can be as simple as a straight line
              or as complex as a parabolic arc.
            </p>
            <p className="mt-4 text-gray-300">
              The game is designed to be a{' '}
              <span className="text-white font-semibold">
                self-evolving system
              </span>
              . Players create levels for other players simply by playing. If
              you beat 5 levels, for instance, then lose on the 6th, then your
              battle (your actions) is saved as a level 6 battle for other
              players to face. The top player is the one whose saved battle has
              never been beaten.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">
              Basic Gameplay
            </h2>
            <ol className="space-y-3 text-gray-300 list-decimal list-outside ml-4">
              <li>
                You have{' '}
                <span className="text-white font-semibold">10 rounds</span> to
                bring your opponent&apos;s castle health to 0.
              </li>
              <li>
                Each round has{' '}
                <span className="text-white font-semibold">2 turns</span>:
                yours, then your opponent&apos;s.
              </li>
              <li>
                Each turn, you can perform{' '}
                <span className="text-white font-semibold">2 actions</span>:
                install a tower, move a tower, or modify a tower.
              </li>
              <li>
                After your opponent&apos;s turn, round results will render.
                These are the results of your tower modifications (like shooting
                a projectile a certain way).
              </li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-cyan-400 mb-3">Notes</h2>
            <ul className="space-y-3 text-gray-300 list-disc list-outside ml-4">
              <li>
                To modify a tower, click on the tower you want to modify, change
                the <span className="text-white font-semibold">Solidity</span>{' '}
                code, then click the &quot;deploy&quot; button.
              </li>
              <li>
                If your logic cannot compile, you&apos;ll receive an error. If
                it does compile, but is invalid, your tower will not do anything
                when the round results render.
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
