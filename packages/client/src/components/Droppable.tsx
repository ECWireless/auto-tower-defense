import { useDroppable } from '@dnd-kit/core';

type DroppableProps = {
  children: React.ReactNode;
  disabled?: boolean;
  id: string;
  onClick?: () => void;
  staticStyle?: React.CSSProperties;
};

export const Droppable: React.FC<DroppableProps> = ({
  children,
  disabled,
  id,
  onClick,
}): JSX.Element => {
  const { setNodeRef } = useDroppable({
    id,
  });
  const style = {};

  return (
    <div
      onClick={onClick}
      ref={disabled ? undefined : setNodeRef}
      style={disabled ? undefined : style}
    >
      {children}
    </div>
  );
};
