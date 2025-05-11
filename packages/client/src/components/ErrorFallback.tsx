import { wait } from '@latticexyz/common/utils';
import { useEffect, useRef, useState } from 'react';
import { FallbackProps } from 'react-error-boundary';

export const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element => {
  const when = new Date();
  const isMounted = useRef(false);
  const [retries, setRetries] = useState(1);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  });

  return (
    <div className="bg-red-50 fixed inset-0 overflow-auto">
      <div className="max-w-screen-md mx-auto py-16 px-8 space-y-12 w-full">
        <h1 className="font-black text-red-500 text-4xl">Oops! It broke :(</h1>
        <div className="space-y-6">
          <div className="relative">
            <div className="bg-red-100 border-l-8 border-red-500 font-semibold p-6 whitespace-pre-wrap -ml-[8px]">
              {error instanceof Error ? error.message : String(error)}
            </div>
            {error instanceof Error && error.stack ? (
              <div className="bg-white font-mono overflow-auto p-6 text-sm whitespace-pre">
                {error.stack}
              </div>
            ) : null}
            <div
              className="absolute right-0 top-full text-sm text-stone-400"
              title={when.toISOString()}
            >
              {when.toLocaleString()}
            </div>
          </div>

          {retries > 0 ? (
            <button
              className="active:bg-red-700 aria-busy:animate-pulse aria-busy:pointer-events-none bg-red-500 group hover:bg-red-600 rounded-md text-white transition px-4 py-2"
              onClick={async event => {
                // if we retry and the same error occurs, it'll look like the button click did nothing
                // so we'll fake a pending state here to give users an indication something is happening
                event.currentTarget.ariaBusy = 'true';
                await wait(1000);
                resetErrorBoundary();
                if (isMounted.current) {
                  setRetries(value => value - 1);
                  event.currentTarget.ariaBusy = null;
                }
              }}
              type="button"
            >
              <span className="group-aria-busy:hidden">Retry?</span>
              <span className="group-aria-busy:inline hidden">Retrying…</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
