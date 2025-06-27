import { useState } from 'react';

import { MUDIcon } from '@/components/icons/MUDIcon';
import { getGameChain, getWorldAddress } from '@/utils/helpers';

export const Explorer = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);

  const gameChain = getGameChain();
  const worldAddress = getWorldAddress();

  const explorerUrl = gameChain.blockExplorers?.worldsExplorer?.url;
  if (!explorerUrl) return null;

  return (
    <div className="bottom-0 fixed flex flex-col hover:opacity-100 inset-x-0 opacity-80 transition z-100">
      <button
        className="flex font-medium gap-2 hover:cursor-pointer justify-end leading-none outline-none p-2 text-white"
        onClick={() => setOpen(!open)}
        type="button"
      >
        {open ? (
          <>Close</>
        ) : (
          <>
            Explore <MUDIcon className="text-orange-500" />
          </>
        )}
      </button>
      {open && (
        <iframe
          className="bg-black h-[50vh]"
          src={`${explorerUrl}/${worldAddress}`}
        />
      )}
    </div>
  );
};
