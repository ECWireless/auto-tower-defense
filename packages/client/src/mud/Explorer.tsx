import { useState } from 'react';

import { getChain, getWorldAddress } from '@/common';
import { MUDIcon } from '@/components/icons/MUDIcon';

export const Explorer = (): JSX.Element | null => {
  const [open, setOpen] = useState(false);

  const chain = getChain();
  const worldAddress = getWorldAddress();

  const explorerUrl = chain.blockExplorers?.worldsExplorer?.url;
  if (!explorerUrl) return null;

  return (
    <div className="bottom-0 fixed flex flex-col hover:opacity-100 inset-x-0 opacity-80 transition">
      <button
        className="flex font-medium gap-2 justify-end leading-none outline-none p-2 text-black"
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
