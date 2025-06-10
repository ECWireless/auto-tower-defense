export const ClickIndicator: React.FC = () => {
  return (
    <div className="pointer-events-none">
      <div className="absolute bg-yellow-400 rounded-full h-3 w-3 z-10 -right-0 -top-0" />
      <div className="absolute animate-ping bg-yellow-400 h-3 opacity-75 rounded-full w-3 z-0 -right-0 -top-0" />
      <div className="absolute animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] border-2 border-yellow-400 h-8 opacity-60 right-0.5 rounded-full top-1 w-8 -m-3" />
      <div className="absolute animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] border border-yellow-300 h-10 opacity-40 right-0.5 rounded-full top-1 w-10 -m-4" />
    </div>
  );
};
