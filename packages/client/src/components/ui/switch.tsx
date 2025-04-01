import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>): JSX.Element {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer cursor-pointer data-[state=checked]:bg-cyan-600 data-[state=unchecked]:bg-gray-700 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-[1.15rem] w-[34px] shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-black h-[14px] w-[14px] pointer-events-none block rounded-full ring-0 transition-transform',
        )}
        style={{
          transform: props.checked
            ? 'translateX(18px)' // Move thumb to the right when checked
            : 'translateX(0)', // Move thumb to the left when unchecked
        }}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
