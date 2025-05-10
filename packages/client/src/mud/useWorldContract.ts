import { useSessionClient } from '@latticexyz/entrykit/internal';
import { observer } from '@latticexyz/explorer/observer';
import { useQuery } from '@tanstack/react-query';
import worldAbi from 'contracts/out/IWorld.sol/IWorld.abi.json';
import {
  Account,
  Chain,
  Client,
  getContract,
  GetContractReturnType,
  Transport,
} from 'viem';
import { useClient } from 'wagmi';

import { chainId, getWorldAddress } from '@/common';

export const useWorldContract = ():
  | GetContractReturnType<
      typeof worldAbi,
      {
        public: Client<Transport, Chain>;
        wallet: Client<Transport, Chain, Account>;
      }
    >
  | undefined => {
  const client = useClient({ chainId });
  const { data: sessionClient } = useSessionClient();

  const { data: worldContract } = useQuery({
    queryKey: ['worldContract', client?.uid, sessionClient?.uid],
    queryFn: () => {
      if (!client || !sessionClient) {
        throw new Error('Not connected.');
      }

      return getContract({
        abi: worldAbi,
        address: getWorldAddress(),
        client: {
          public: client,
          wallet: sessionClient.extend(observer()),
        },
      });
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  return worldContract;
};
