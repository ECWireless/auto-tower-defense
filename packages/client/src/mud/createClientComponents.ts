/*
 * Creates components for use by the client.
 *
 * By default it returns the components from setupNetwork.ts, those which are
 * automatically inferred from the mud.config.ts table definitions.
 *
 * However, you can add or override components here as needed. This
 * lets you add user defined components, which may or may not have
 * an onchain component.
 */

import { SetupNetworkResult } from './setupNetwork';

export type ClientComponents = ReturnType<typeof createClientComponents>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClientComponents({ components }: SetupNetworkResult) {
  return {
    ...components,
  };
}
