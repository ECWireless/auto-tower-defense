import { createContext, ReactNode, useContext, useState } from 'react';

type SolarFarmContextType = {
  isSolarFarmDialogOpen: boolean;
  setIsSolarFarmDialogOpen: (show: boolean) => void;
};

const SolarFarmContext = createContext<SolarFarmContextType>({
  isSolarFarmDialogOpen: false,
  setIsSolarFarmDialogOpen: () => undefined,
});

export type SolarFarmProviderProps = {
  children: ReactNode;
};

export const SolarFarmProvider = ({
  children,
}: SolarFarmProviderProps): JSX.Element => {
  const [isSolarFarmDialogOpen, setIsSolarFarmDialogOpen] =
    useState<boolean>(false);

  return (
    <SolarFarmContext.Provider
      value={{
        isSolarFarmDialogOpen,
        setIsSolarFarmDialogOpen,
      }}
    >
      {children}
    </SolarFarmContext.Provider>
  );
};

export const useSolarFarm = (): SolarFarmContextType =>
  useContext(SolarFarmContext);
